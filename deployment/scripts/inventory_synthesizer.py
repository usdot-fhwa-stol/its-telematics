#!/usr/bin/env python3
"""Resolve deployment targets and generate the Ansible inventory."""

import getpass
import os
import shlex
import sys
from pathlib import Path
from typing import Dict, List, Optional

from models import (
    CONNECTION_LOCAL,
    CONNECTION_SSH,
    DEPLOYMENT_DIR,
    LOCAL_TARGET_ALIASES,
    ROLE_ALL,
    SERVICE_ROLES,
    TARGET_CLOUD,
    TARGET_LOCALHOST,
    TARGET_REMOTE,
    InventoryReference,
    ProvisionedInfrastructure,
    TargetProfile,
)

SSH_COMMON_ARGS = "-o StrictHostKeyChecking=accept-new"
DEFAULT_INVENTORY_PATHS = {
    TARGET_LOCALHOST: DEPLOYMENT_DIR / "targets" / "on-premise" / "inventory.ini",
    TARGET_REMOTE: DEPLOYMENT_DIR / "targets" / "on-premise" / "inventory.ini",
    TARGET_CLOUD: DEPLOYMENT_DIR / "targets" / "cloud" / "inventory.ini",
}


class InventorySynthesizer:
    """Translates CLI arguments and provisioned infrastructure into TargetProfiles and an Ansible inventory."""

    def __init__(
        self,
        target: str,
        remote_address: str = "",
        remote_user: str = "",
        key_path: str = "",
        infrastructure: Optional[ProvisionedInfrastructure] = None,
        inventory_path: Optional[Path] = None,
    ):
        """Capture the CLI arguments and optional provisioned infrastructure.

        Args:
            target: Deployment target (localhost alias, remote, or cloud).
            remote_address: Host address of a remote target.
            remote_user: SSH login user of a remote target.
            key_path: SSH private (or .pub) key path for remote and cloud targets.
            infrastructure: Provisioned instances; when given, they replace the single target.
            inventory_path: Output inventory file; defaults to a per-target scratch location.
        """
        self.target = target
        self.remote_address = remote_address
        self.remote_user = remote_user
        self.key_path = key_path
        self.infrastructure = infrastructure
        self.inventory_path = inventory_path or DEFAULT_INVENTORY_PATHS.get(
            TARGET_LOCALHOST if target.lower() in LOCAL_TARGET_ALIASES else target, DEFAULT_INVENTORY_PATHS[TARGET_REMOTE],
        )
        self.target_profiles: List[TargetProfile] = []

    def evaluate_target(self) -> List[TargetProfile]:
        """Determine whether the deployment target is local or remote and resolve its connection details.

        Resolves the host address, user account, connection transport, and credential reference.
        A local target uses the loopback transport and needs no credentials. A remote target uses SSH
        with an absolute private key path (a .pub path is mapped to its private key). Provisioned
        infrastructure yields one remote profile per instance.

        Returns:
            The resolved TargetProfile list, also stored in self.targets.

        Raises:
            ValueError: If a remote target lacks an address or user, has an unreadable key,
                or an instance has an unsupported role.
        """
        if self.infrastructure is not None:
            infra = self.infrastructure
            private_ips = infra.private_ip_addresses or [""] * len(infra.public_ip_addresses)
            self.target_profiles = [
                self._resolve_ssh_target(address, user, role, private_ip)
                for address, user, role, private_ip in zip(
                    infra.public_ip_addresses, infra.ssh_user, infra.roles, private_ips
                )
            ]
        elif self.target.lower() in LOCAL_TARGET_ALIASES:
            self.target_profiles = [TargetProfile(self.target, CONNECTION_LOCAL, TARGET_LOCALHOST, getpass.getuser())]
        else:
            self.target_profiles = [self._resolve_ssh_target(self.remote_address, self.remote_user)]
        return self.target_profiles

    def generate_execution_inventory(self) -> InventoryReference:
        """Write inventory.ini grouping hosts into [ui], [processing], and [database].

        The "all" role places a host in every service group, so one node can serve all roles.
        Each host entry carries its role, private IP, SSH user, and private key path.

        Returns:
            InventoryReference with the file path, group-to-address map, per-host variables,
            and an SSH debug command for the first target.

        Raises:
            ValueError: If no deployment target can be resolved.
        """
        target_profiles = self.target_profiles or self.evaluate_target()
        if not target_profiles:
            raise ValueError("At least one deployment target is required.")
        groups: Dict[str, List[str]] = {}
        host_vars: Dict[str, Dict[str, str]] = {}
        for target_profile in target_profiles:
            for group in (SERVICE_ROLES if target_profile.role == ROLE_ALL else (target_profile.role,)):
                groups.setdefault(group, []).append(target_profile.address)
            host_vars[target_profile.address] = self._host_variables(target_profile)

        lines: List[str] = []
        for group, addresses in groups.items():
            lines += ([""] if lines else []) + [f"[{group}]"]
            for address in addresses:
                lines.append(address + " " + " ".join(f'{k}="{v}"' for k, v in host_vars[address].items()))

        self.inventory_path.parent.mkdir(parents=True, exist_ok=True)
        self.inventory_path.write_text("\n".join(lines) + "\n")
        return InventoryReference(self.inventory_path, groups, host_vars, self._ssh_debug_command(target_profiles[0]))

    def _resolve_ssh_target(self, address: str, user: str, role: str = ROLE_ALL, private_ip: str = "") -> TargetProfile:
        """Validate and build the profile of one SSH-reachable host.

        Args:
            address: Host IP or FQDN.
            user: SSH login user.
            role: ROLE_ALL or one of SERVICE_ROLES.
            private_ip: Internal address recorded in the inventory.

        Returns:
            TargetProfile using the SSH connection and the resolved private key path.

        Raises:
            ValueError: On an unsupported role, missing address or user, or an unreadable key.
        """
        if role != ROLE_ALL and role not in SERVICE_ROLES:
            raise ValueError(f"Unsupported role '{role}'; expected {ROLE_ALL} or one of: {', '.join(SERVICE_ROLES)}.")
        if not address:
            raise ValueError("A remote target requires a host address.")
        if not user:
            raise ValueError("A remote target requires an SSH login user.")
        resolved_key = ""
        if self.key_path:
            key = Path(self.key_path).expanduser()
            if key.suffix == ".pub":
                key = key.with_suffix("")
            if not key.is_file() or not os.access(key, os.R_OK):
                raise ValueError("The SSH private key must be an existing readable file.")
            resolved_key = str(key.resolve())
        return TargetProfile(self.target, CONNECTION_SSH, address, user, resolved_key, role, private_ip)

    def _host_variables(self, target: TargetProfile) -> Dict[str, str]:
        """Build the Ansible host variables for one target.

        Args:
            target: Resolved target profile.

        Returns:
            Local targets get the local connection and current Python interpreter; remote
            targets get private IP, SSH user, key file, and common SSH arguments.
        """
        variables = {"role": target.role}
        if target.is_local:
            variables.update(
                ansible_connection=CONNECTION_LOCAL,
                ansible_user=target.user,
                ansible_python_interpreter=sys.executable,
            )
            return variables
        variables.update(private_ip=target.private_ip, ansible_user=target.user)
        if target.key_path:
            variables["ansible_ssh_private_key_file"] = target.key_path
        variables["ansible_ssh_common_args"] = SSH_COMMON_ARGS
        return variables

    def _ssh_debug_command(self, target_profile: TargetProfile) -> str:
        """Build a copy-pasteable command for testing the connection manually.

        Args:
            target_profile: Resolved target profile.

        Returns:
            An ssh command line, or a note that local targets need no SSH.
        """
        if target_profile.is_local:
            return "local connection (ansible_connection=local); no SSH required"
        command = ["ssh", *shlex.split(SSH_COMMON_ARGS)]
        if target_profile.key_path:
            command += ["-i", target_profile.key_path]
        command.append(f"{target_profile.user}@{target_profile.address}")
        return shlex.join(command)
