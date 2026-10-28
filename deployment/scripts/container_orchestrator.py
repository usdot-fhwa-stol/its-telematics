#!/usr/bin/env python3
"""Manage container images, manifests, and runtime services on the prepared host."""

from datetime import datetime, timezone
import shlex
from pathlib import PurePosixPath
from typing import List, Tuple

import yaml

from ansible_runner import ALL_HOSTS, run_ad_hoc, run_shell
from models import CommandResult, ExecutionContext

COMPOSE_PROJECT = "deployment"
ENV_RUNTIME_FILE = ".env"
BIND_MOUNTED_FILES = ("scripts/database/init-databases.sh",)
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
        return CommandResult(step, True, 0, f"Synchronized {len(transfers)} files to {self.workspace}")

    def pull_managed_images(self) -> CommandResult:
        """Pre-fetch the latest images so startup does not time out on downloads.

        Returns:
            CommandResult of docker compose pull on every host.
        """
        return run_shell(self.inventory, ALL_HOSTS,
                         f"cd {self._workspace_command_path()} && {self._compose} pull",
                         "Pull container images", timeout=PULL_TIMEOUT_SECONDS)

    def deploy_service(self) -> CommandResult:
        """Bring down any running stack, start it on the latest images, wait for health checks, and return the Compose container status table.

        Returns:
            CommandResult containing running container statuses, or the first startup/status failure.
        """
        timeout = self.context.startup_timeout_seconds
        workspace = self._workspace_command_path()
        if self.context.prune_volumes:
            # Volumes are removed even when nothing is running, so every deployment starts with fresh data.
            reset = (f"echo 'Removing existing services and Docker volumes' && "
                     f"{self._compose} down --volumes --remove-orphans")
        else:
            # Bring down any running stack first so containers restart on the freshly pulled images.
            reset = (f"if [ -n \"$({self._compose} ps -q)\" ]; then "
                     f"echo 'Running services detected; bringing them down'; "
                     f"{self._compose} down --remove-orphans; fi")
        script = (
            f"cd {workspace} && {reset} && "
            f"{self._compose} up -d --force-recreate --pull always --wait --wait-timeout {timeout} --remove-orphans"
        )
        deploy = run_shell(
            self.inventory, ALL_HOSTS, script,
            "Deploy services", timeout=timeout + 300,
        )
        if not deploy.success:
            return deploy

        status = run_shell(
            self.inventory, ALL_HOSTS,
            f"cd {self._workspace_command_path()} && {self._compose} ps",
            "Read deployed container status", timeout=STEP_TIMEOUT_SECONDS,
        )
        if not status.success:
            return CommandResult(
                deploy.step, False, status.exit_code or 1,
                deploy.stdout, status.stderr or status.stdout,
            )
        return CommandResult(deploy.step, True, 0, status.stdout, status.stderr)

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

    def capture_error_logs(self) -> str:
        """Return a timestamped trace of the last N log lines from every stopped or unhealthy container.

        Returns:
            Trace text with a UTC timestamp header and the collected logs, or a note that no
            failing containers were found.
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
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        body = result.stdout.strip() or result.stderr.strip() or "No failing containers were found."
        return f"[{stamp}] last {lines} log lines per failing container\n{body}"

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
