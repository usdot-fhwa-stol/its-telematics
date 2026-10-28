#!/usr/bin/env python3
"""Prepare and validate the target operating system and container runtime before deployment."""

import json
import os
from pathlib import Path
import subprocess

from ansible_runner import ALL_HOSTS, run_ad_hoc, run_playbook, run_shell
from models import CommandResult, ExecutionContext

PLAYBOOK = Path(__file__).resolve().parent.parent / "config" / "ansible" / "playbooks" / "host_preparation.yml"
MINIMUM_SUPPORTED_OS_VERSIONS = {"Ubuntu": (20, 4)}
CONNECTION_TIMEOUT_SECONDS = 300
PLAYBOOK_TIMEOUT_SECONDS = 1800
# Succeeds only when every item the host preparation playbook provisions is already in place.
DEPENDENCY_CHECK = (
    "command -v docker >/dev/null && docker compose version >/dev/null 2>&1 "
    "&& systemctl is-active --quiet docker "
    "&& { [ \"$(id -u)\" = 0 ] || id -nG | tr ' ' '\\n' | grep -qx docker; } "
    "&& for d in /opt/telematics/upload /opt/telematics/logs /opt/grafana/logs /opt/grafana/data "
    "/opt/grafana/provisioning /opt/apache2 /opt/influxdb2/data; do [ -d \"$d\" ] || exit 1; done "
    "&& [ -f /opt/apache2/grafana_htpasswd ]"
)
LOCAL_HOSTS_CHECK = " && grep -q 'local.cav-telematics.com' /etc/hosts"


def is_supported_operating_system(name: str, version: str) -> bool:
    """Return whether a distribution meets its configured minimum version."""
    minimum = MINIMUM_SUPPORTED_OS_VERSIONS.get(name)
    if minimum is None:
        return False
    try:
        release = tuple(int(part) for part in version.split(".")[:2])
    except ValueError:
        return False
    return len(release) == 2 and release >= minimum


class HostPreparationService:
    """Verifies the OS against the compatibility matrix and installs the container toolchain."""

    def __init__(self, context: ExecutionContext):
        """Bind the service to the shared execution context.

        Args:
            context: Immutable execution context providing the inventory reference.
        """
        self.context = context
        self.inventory = context.inventory.inventory_file_path

    def verify_operating_system(self) -> CommandResult:
        """Gather facts through Ansible and confirm every host runs a supported distribution.

        Runs before any state-changing step. Waits for SSH on freshly provisioned hosts first.

        Returns:
            CommandResult that is successful when all hosts meet the supported OS minimums;
            stdout lists each host's distribution, stderr names unsupported or unparsable hosts.
        """
        step = "Verify operating system"
        wait = run_ad_hoc(self.inventory, ALL_HOSTS, "ansible.builtin.wait_for_connection",
                          {"timeout": CONNECTION_TIMEOUT_SECONDS}, step,
                          timeout=CONNECTION_TIMEOUT_SECONDS + 60)
        if not wait.success:
            return wait
        facts = run_ad_hoc(self.inventory, ALL_HOSTS, "ansible.builtin.setup",
                           {"filter": "ansible_distribution*"}, step, json_output=True, timeout=120)
        if not facts.success:
            return facts
        try:
            hosts = json.loads(facts.stdout[facts.stdout.index("{"):])["plays"][0]["tasks"][0]["hosts"]
        except (ValueError, KeyError, IndexError):
            return CommandResult(step, False, 1, facts.stdout, "Could not parse the gathered system facts.")

        problems, summary = [], []
        for host, result in hosts.items():
            host_facts = result.get("ansible_facts", {})
            name = host_facts.get("ansible_distribution", "unknown")
            version = host_facts.get("ansible_distribution_version", "unknown")
            summary.append(f"{host}: {name} {version}")
            if not is_supported_operating_system(name, version):
                problems.append(f"{host}: {name} {version}")
        if problems:
            supported = ", ".join(f"{name} {version[0]}.{version[1]:02d} or later"
                                  for name, version in MINIMUM_SUPPORTED_OS_VERSIONS.items())
            return CommandResult(step, False, 1, "\n".join(summary),
                                 f"Unsupported operating system ({supported} required): " + "; ".join(problems))
        return CommandResult(step, True, 0, "\n".join(summary))

    def install_system_dependencies(self) -> CommandResult:
        """Install docker.io, the Compose plugin, and transport libraries, and add the deployment user to the docker group.

        A read-only check runs first; the playbook (and sudo) is skipped when everything is already present.

        Returns:
            CommandResult of sudo authentication or the host preparation playbook run.
        """
        step = "Install system dependencies"
        check = DEPENDENCY_CHECK
        if all(profile.is_local for profile in self.context.target_profiles):
            check += LOCAL_HOSTS_CHECK
        if run_shell(self.inventory, ALL_HOSTS, check, step, timeout=CONNECTION_TIMEOUT_SECONDS).success:
            return CommandResult(step, True, 0, "System dependencies already installed; skipping.")

        if any(profile.is_local for profile in self.context.target_profiles) and os.geteuid() != 0:
            try:
                authentication = subprocess.run(["sudo", "-v"], check=False, timeout=300)
            except subprocess.TimeoutExpired:
                return CommandResult(step, False, 124, "", "Timed out waiting for sudo authentication.")
            except OSError:
                return CommandResult(step, False, 126, "", "Could not execute sudo for localhost provisioning.")
            if authentication.returncode:
                return CommandResult(
                    step, False, authentication.returncode, "",
                    "Sudo authentication failed; authenticate successfully or run as root.",
                )
        return run_playbook(self.inventory, PLAYBOOK, "Install system dependencies",
                            timeout=PLAYBOOK_TIMEOUT_SECONDS)
