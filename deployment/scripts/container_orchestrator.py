#!/usr/bin/env python3
"""Manage container images, manifests, and runtime services on the prepared host."""

import json
import shlex
import time
from pathlib import PurePosixPath
from typing import Callable, List, Tuple

import yaml

from ansible_runner import ALL_HOSTS, run_ad_hoc, run_shell
from models import CommandResult, ExecutionContext, LogTrace, ROLE_DATABASE, ROLE_PROCESSING, ROLE_UI

MAX_UPDATE_ATTEMPTS = 10
STABILITY_SECONDS = 10
COMPOSE_PROJECT = "deployment"
ENV_RUNTIME_FILE = ".env"
BIND_MOUNTED_FILES = ("scripts/database/init-databases.sh",)
# Cross-node settings: variable -> (role of the node running the service, value template).
# {ip} is the role node's private IP (or address). Services default to this host in .env, so a
# variable is rewritten only on nodes that do not run the service themselves.
SERVICE_ENDPOINTS = {
    "CLIENT_LOCAL_URL": (ROLE_UI, "http://{ip}:8082/"),
    "GRAFANA_LOCAL_URL": (ROLE_UI, "http://{ip}:3000/"),
    "UISERVICE_LOCAL_URL": (ROLE_UI, "http://{ip}:9010/"),
    "UISERVICE_LOCAL_UPLOAD_URL": (ROLE_UI, "http://{ip}:9011/"),
    "TOPICSERVICE_LOCAL_URL": (ROLE_PROCESSING, "http://{ip}:8080/"),
    # Port stays tied to rsu_server_port, defined earlier in the same .env.
    "RSU_MANAGEMENT_SERVICE_URL": (ROLE_PROCESSING, "http://{ip}:${{rsu_server_port}}"),
    "NATS_IP": (ROLE_PROCESSING, "{ip}"),
    "MYSQL_HOST": (ROLE_DATABASE, "{ip}"),
    "INFLUXDB_HOST": (ROLE_DATABASE, "{ip}"),
    "INFLUXDB3_IP": (ROLE_DATABASE, "{ip}"),
}
PULL_TIMEOUT_SECONDS = 1800
STEP_TIMEOUT_SECONDS = 300


class ContainerOrchestrator:
    """Synchronizes manifests to the relative telematic_system directory and drives docker compose."""

    def __init__(self, context: ExecutionContext):
        """Bind the orchestrator to the shared execution context.

        Args:
            context: Immutable execution context providing the inventory, remote workspace,
                manifest reference, registry endpoints, startup timeout, and log tail length.
        """
        self.context = context
        self.reporter: Callable[[str, int], None] = lambda message, depth: None
        self.inventory = context.inventory.inventory_file_path
        self.local_target = bool(context.target_profiles) and all(
            profile.is_local for profile in context.target_profiles
        )
        self.workspace = (
            str(context.repo_root / context.remote_workspace)
            if self.local_target else context.remote_workspace
        )
        self._compose = (
            f"docker compose --project-name {COMPOSE_PROJECT} --env-file {ENV_RUNTIME_FILE}"
        )

    def _workspace_command_path(self) -> str:
        """Return the shell-safe workspace path for the local or remote target."""
        if self.local_target:
            return shlex.quote(self.workspace)
        return f'"$HOME"/{shlex.quote(self.workspace)}'

    def verify_registry_connectivity(self) -> CommandResult:
        """Check from the target that each image registry is reachable (HTTP 200, or 401 for an auth challenge).

        Returns:
            Successful CommandResult, or the first failure naming the unreachable registry.
        """
        for endpoint in self.context.registry_endpoints:
            result = run_ad_hoc(
                self.inventory, ALL_HOSTS, "ansible.builtin.uri",
                {"url": endpoint, "status_code": [200, 401], "timeout": 30},
                "Verify registry connectivity", timeout=STEP_TIMEOUT_SECONDS,
            )
            if not result.success:
                return CommandResult(result.step, False, result.exit_code, result.stdout,
                                     f"Registry {endpoint} is not reachable from the target.\n{result.stderr}")
        return CommandResult("Verify registry connectivity", True)

    def synchronize_service_manifests(self) -> CommandResult:
        """Create the relative telematic_system directory, copy .env, and transfer compose files and secrets.

        Returns:
            Successful CommandResult with the number of files synchronized, or the first failure
            (including a missing or unparsable manifest file).
        """
        step = "Synchronize service manifests"
        try:
            transfers = self._manifest_transfers()
        except (OSError, ValueError, yaml.YAMLError) as error:
            return CommandResult(step, False, 1, "", f"Could not resolve the manifest files: {error}")
        if self.local_target:
            # The checkout already holds every file in place; never create or copy a second workspace.
            return CommandResult(step, True, 0, f"Using existing files in {self.workspace}")

        for directory in sorted({self.workspace, *(f"{self.workspace}/{PurePosixPath(dest).parent}".removesuffix("/.")
                                                   for _, dest, _ in transfers)}):
            created = run_ad_hoc(self.inventory, ALL_HOSTS, "ansible.builtin.file",
                                 {"path": directory, "state": "directory", "mode": "0755"}, step,
                                 timeout=STEP_TIMEOUT_SECONDS)
            if not created.success:
                return created
        for source, destination, mode in transfers:
            if destination in BIND_MOUNTED_FILES:
                # A missing bind-mount source makes Docker create a root-owned directory in its place; clear it.
                cleared = run_shell(self.inventory, ALL_HOSTS,
                                    f"[ ! -d {shlex.quote(f'{self.workspace}/{destination}')} ] || "
                                    f"sudo -n rm -rf {shlex.quote(f'{self.workspace}/{destination}')}",
                                    step, timeout=STEP_TIMEOUT_SECONDS)
                if not cleared.success:
                    return cleared
            copied = run_ad_hoc(self.inventory, ALL_HOSTS, "ansible.builtin.copy",
                                {"src": str(source), "dest": f"{self.workspace}/{destination}", "mode": mode},
                                step, timeout=STEP_TIMEOUT_SECONDS)
            if not copied.success:
                return copied
        for host, overrides in self._service_endpoint_overrides().items():
            for variable, value in overrides.items():
                configured = run_ad_hoc(
                    self.inventory, host, "ansible.builtin.lineinfile",
                    {"path": f"{self.workspace}/{ENV_RUNTIME_FILE}", "line": f"{variable}={value}",
                     "regexp": f"^{variable}="}, step, timeout=STEP_TIMEOUT_SECONDS)
                if not configured.success:
                    return configured
        return CommandResult(step, True, 0, f"Synchronized {len(transfers)} files to {self.workspace}")

    def _service_endpoint_overrides(self) -> dict:
        """Return, per host, the .env settings that must point at another node's service.

        In a centralized deployment (role "all") every host runs every service, so nothing is
        overridden and the localhost defaults stay. In a distributed deployment a host that is not in
        a service's role group addresses the first node of that group by private IP (or address).

        Returns:
            Dict of inventory host to {variable: value}; hosts with no overrides are omitted.
        """
        groups = self.context.inventory.target_groups
        host_vars = self.context.inventory.host_variables
        hosts = sorted({host for members in groups.values() for host in members})
        result = {}
        for host in hosts:
            overrides = {}
            for variable, (role, template) in SERVICE_ENDPOINTS.items():
                members = groups.get(role, [])
                if members and host not in members:
                    ip = host_vars.get(members[0], {}).get("private_ip") or members[0]
                    overrides[variable] = template.format(ip=ip)
            if overrides:
                result[host] = overrides
        return result

    def pull_managed_images(self) -> CommandResult:
        """Pre-fetch the latest images so startup does not time out on downloads.

        Returns:
            CommandResult of docker compose pull on every host.
        """
        return run_shell(self.inventory, ALL_HOSTS,
                         f"cd {self._workspace_command_path()} && {self._compose} pull",
                         "Pull container images", timeout=PULL_TIMEOUT_SECONDS)

    def log(self, message: str, depth: int = 1) -> None:
        """Report a progress message to the pipeline output as it happens.

        Args:
            message: Text to show.
            depth: 1 for a bullet under the running step, 2 for a nested bullet.
        """
        self.reporter(message, depth)

    def deploy_service(self) -> CommandResult:
        """Bring down any running stack, start it on the latest images, and retry until every container is up.

        Each phase is a separate remote command and is reported through self.log as it happens.
        If containers are restarting or unhealthy, images are pulled and the stack is started again,
        at most MAX_UPDATE_ATTEMPTS times.

        Returns:
            CommandResult containing the Compose container status table, or the failure of a phase.
        """
        step = "Deploy services"
        timeout = self.context.startup_timeout_seconds
        workspace = self._workspace_command_path()
        up = f"{self._compose} up -d --pull always --wait --wait-timeout {timeout} --remove-orphans"

        if self.context.prune_volumes:
            # Volumes are removed even when nothing is running, so every deployment starts with fresh data.
            self.log("Removing existing services and Docker volumes")
            reset = f"{self._compose} down --volumes --remove-orphans"
        else:
            # Bring down any running stack first so containers restart on the freshly pulled images.
            self.log("Bringing down any running services")
            reset = f"{self._compose} down --remove-orphans"
        result = run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {reset}", step, timeout=STEP_TIMEOUT_SECONDS)
        if not result.success:
            return result

        self.log("Starting services")
        result = run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {up} --force-recreate",
                           step, timeout=timeout + 300)
        self._log_compose_output(result)

        attempt = 0
        while True:
            problems = self._not_running()
            if not problems:
                time.sleep(STABILITY_SECONDS)  # catches containers that crash right after starting
                problems = self._not_running()
            if not problems:
                self.log("All services are up and running")
                break
            self.log(f"Services not up yet (update attempt {attempt} of {MAX_UPDATE_ATTEMPTS})")
            for problem in problems:
                self.log(problem, depth=2)
            if attempt >= MAX_UPDATE_ATTEMPTS:
                status = run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {self._compose} ps -a",
                                   step, timeout=STEP_TIMEOUT_SECONDS)
                return CommandResult(step, False, 1, status.stdout,
                                     "Services still not up after the maximum update attempts:\n" + "\n".join(problems))
            attempt += 1
            self.log(f"Pulling updates and restarting (attempt {attempt} of {MAX_UPDATE_ATTEMPTS})")
            run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {self._compose} pull --ignore-pull-failures",
                      step, timeout=PULL_TIMEOUT_SECONDS)
            result = run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {up}", step, timeout=timeout + 300)
            self._log_compose_output(result)
            time.sleep(5)

        status = run_shell(self.inventory, ALL_HOSTS, f"cd {workspace} && {self._compose} ps",
                           step, timeout=STEP_TIMEOUT_SECONDS)
        if not status.success:
            return CommandResult(step, False, status.exit_code or 1, status.stdout, status.stderr or status.stdout)
        return CommandResult(step, True, 0, status.stdout, status.stderr)

    def _log_compose_output(self, result: CommandResult) -> None:
        """Report the container lifecycle lines of a Compose run, or its error when it failed."""
        text = result.stdout if result.success else (result.stderr or result.stdout)
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith(("[WARNING]", "[DEPRECATION")):
                continue
            if result.success and "|" in line and ">>" in line:
                continue  # Ansible host banner
            self.log(line, depth=2)

    def _not_running(self) -> List[str]:
        """List containers of the project that are not running, restarting, or not healthy.

        Returns:
            One "host: container: status" entry per problem container; empty when all are up.
        """
        # `--format json` avoids Jinja-style braces, which Ansible would try to template.
        result = run_shell(
            self.inventory, ALL_HOSTS,
            f"docker ps -a --filter label=com.docker.compose.project={COMPOSE_PROJECT} --format json",
            "Check container status", timeout=STEP_TIMEOUT_SECONDS,
        )
        problems, host = [], ""
        for line in result.stdout.splitlines():
            line = line.strip()
            if "|" in line and ">>" in line:
                host = line.split("|")[0].strip()
            elif line.startswith("{"):
                try:
                    container = json.loads(line)
                except ValueError:
                    continue
                status = container.get("Status", "")
                if container.get("State") != "running" or "unhealthy" in status or "health: starting" in status:
                    problems.append(f"{host}: {container.get('Names', '?')}: {status}")
        if not result.success:
            problems.append(f"Could not read container status: {(result.stderr or result.stdout).strip()[-200:]}")
        return problems

    def tear_down_stack(self) -> CommandResult:
        """Stop and remove the stack so a failed deployment leaves no containers running.

        Returns:
            CommandResult of docker compose down; its stdout is a one-line summary.
        """
        result = run_shell(
            self.inventory, ALL_HOSTS,
            f"cd {self._workspace_command_path()} && {self._compose} down --remove-orphans",
            "Tear down failed deployment", timeout=STEP_TIMEOUT_SECONDS,
        )
        outcome = "Failed deployment torn down." if result.success else "Could not tear down the failed deployment."
        return CommandResult(result.step, result.success, result.exit_code, outcome, result.stderr)

    def capture_error_logs(self) -> LogTrace:
        """Capture the last N log lines from every stopped or unhealthy container.

        Returns:
            LogTrace stamped with the UTC capture time whose payload is the collected logs, or a
            note that no failing containers were found.
        """
        lines = int(self.context.log_tail_lines)
        label = f"label=com.docker.compose.project={COMPOSE_PROJECT}"
        script = (
            f"cd {self._workspace_command_path()} && {self._compose} ps -a; "
            f'for c in $(docker ps -aq --filter {label} --filter status=exited --filter status=dead '
            f'--filter status=restarting) $(docker ps -aq --filter {label} --filter health=unhealthy '
            f'--filter health=starting); do '
            f'echo "=== container $c"; docker logs --tail {lines} --timestamps "$c" 2>&1; done'
        )
        result = run_shell(self.inventory, ALL_HOSTS, script, "Capture error logs", timeout=STEP_TIMEOUT_SECONDS)
        body = result.stdout.strip() or result.stderr.strip() or "No failing containers were found."
        return LogTrace.from_text("containers", body)

    def terminate_orphaned_workloads(self) -> CommandResult:
        """Remove stopped containers left by earlier deployment runs.

        Returns:
            CommandResult of docker container prune for the deployment project.
        """
        return run_shell(
            self.inventory, ALL_HOSTS,
            f"docker container prune --force --filter label=com.docker.compose.project={COMPOSE_PROJECT}",
            "Remove orphaned containers", timeout=STEP_TIMEOUT_SECONDS,
        )

    def _manifest_transfers(self) -> List[Tuple]:
        """List (local source, relative destination, mode) for .env, compose files, and secrets.

        Returns:
            List of (local source path, destination relative to the workspace, file mode) tuples.

        Raises:
            OSError: If a manifest cannot be read.
            ValueError: If an include entry is unsupported or a source file is missing.
            yaml.YAMLError: If a compose manifest is not valid YAML.
        """
        root = self.context.repo_root
        reference = self.context.manifest_reference
        runtime_env = root / reference["runtime_env_path"]
        transfers = [(runtime_env, ENV_RUNTIME_FILE, "0600")]

        manifests = [root / path for path in reference["compose_manifest_paths"]]
        for manifest in manifests:
            transfers.append((manifest, manifest.name, "0644"))
            for entry in (yaml.safe_load(manifest.read_text()) or {}).get("include", []):
                path = entry.get("path") if isinstance(entry, dict) else entry
                if not isinstance(path, str):
                    raise ValueError(f"Unsupported include entry in {manifest.name}")
                transfers.append((manifest.parent / path, path, "0644"))

        # Compose resolves ./secrets/*.txt relative to the manifest directory.
        for secret in sorted((manifests[0].parent / "secrets").glob("*.txt")):
            transfers.append((secret, f"secrets/{secret.name}", "0644"))

        # Files that compose bind-mounts from the workspace; they must exist on the target host.
        for script in BIND_MOUNTED_FILES:
            transfers.append((manifests[0].parent / script, script, "0755"))

        for source, _, _ in transfers:
            if not source.is_file():
                raise ValueError(f"Missing file {source}; run the configuration step first")
        return transfers
