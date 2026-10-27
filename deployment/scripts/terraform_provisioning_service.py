#!/usr/bin/env python3
"""Zero-touch AWS provisioning via Terraform with Ansible inventory generation."""

import json
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from cloud_provisioning_service import CloudProvisioningService
from configuration_service import DEFAULT_WORKSPACE_ROOT
from models import (
    DeploymentProfile,
    InventoryReference,
    ProvisionedInfrastructure,
    TerraformContext,
    TerraformExecutionResult,
)

ALL_ROLE_GROUPS = ("ui", "processing", "database")
SSH_USER = "ubuntu"


class TerraformProvisioningService(CloudProvisioningService):
    """Runs the Terraform CLI against the AWS module in deployment/infra/terraform/aws."""

    def __init__(
        self,
        workspace: str = "default",
        backend_config: Optional[Dict[str, str]] = None,
        terraform_bin: str = "terraform",
    ):
        self.workspace = workspace
        self.backend_config = backend_config or {}
        self.terraform_bin = terraform_bin

    def _run(self, context: TerraformContext, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [self.terraform_bin, f"-chdir={context.root_path}", *args],
            capture_output=True, text=True, check=False,
        )

    def initialize_terraform(self, context: TerraformContext) -> TerraformContext:
        """Install providers (the var file is written beforehand by generate_terraform_variables), configure the backend, and select (or create) the workspace."""
        init_args = ["init", "-input=false"]
        init_args += [f"-backend-config={k}={v}" for k, v in self.backend_config.items()]
        steps = [
            init_args,
            ["workspace", "select", "-or-create", self.workspace],
        ]
        for step in steps:
            result = self._run(context, *step)
            if result.returncode != 0:
                raise RuntimeError(f"terraform {step[0]} failed: {result.stderr}")
        return context

    def generate_infrastructure_plan(self, context: TerraformContext) -> TerraformExecutionResult:
        """Validate, plan to context.plan_file, and record the proposed resource changes."""
        validate = self._run(context, "validate")
        if validate.returncode != 0:
            return TerraformExecutionResult(False, None, [], validate.stdout, validate.stderr)

        context.plan_file.parent.mkdir(parents=True, exist_ok=True)
        plan = self._run(
            context, "plan", "-input=false", f"-var-file={context.var_file}", f"-out={context.plan_file}",
        )
        if plan.returncode != 0:
            return TerraformExecutionResult(False, None, [], plan.stdout, plan.stderr)

        show = self._run(context, "show", "-json", str(context.plan_file))
        changes: List[str] = []
        if show.returncode == 0:
            for change in json.loads(show.stdout).get("resource_changes", []):
                actions = "+".join(change["change"]["actions"])
                if actions != "no-op":
                    changes.append(f"{actions} {change['address']}")
        return TerraformExecutionResult(True, context.plan_file, changes, plan.stdout, plan.stderr)

    def apply_infrastructure_plan(
        self, context: TerraformContext, approved_plan: Path
    ) -> TerraformExecutionResult:
        """Apply exactly the approved saved plan (no re-planning, so no drift)."""
        if not Path(approved_plan).is_file():
            raise FileNotFoundError(f"Approved plan not found: {approved_plan}")
        result = self._run(context, "apply", "-input=false", str(approved_plan))
        return TerraformExecutionResult(
            result.returncode == 0, Path(approved_plan), [], result.stdout, result.stderr,
        )

    def destroy_infrastructure(self, context: TerraformContext) -> TerraformExecutionResult:
        """Destroy all resources in the selected workspace, including partially created ones."""
        result = self._run(
            context, "destroy", "-input=false", "-auto-approve", f"-var-file={context.var_file}",
        )
        return TerraformExecutionResult(result.returncode == 0, None, [], result.stdout, result.stderr)

    def read_infrastructure_outputs(
        self, context: TerraformContext, apply_result: TerraformExecutionResult
    ) -> ProvisionedInfrastructure:
        """Convert Terraform outputs into ProvisionedInfrastructure (requires a successful apply)."""
        if not apply_result.success:
            raise ValueError("Cannot read outputs from a failed apply")
        result = self._run(context, "output", "-json")
        if result.returncode != 0:
            raise RuntimeError(f"terraform output failed: {result.stderr}")
        outputs = json.loads(result.stdout)
        instances = outputs["instances"]["value"]
        return ProvisionedInfrastructure(
            region=outputs["region"]["value"],
            instance_ids=[i["id"] for i in instances],
            public_ip_addresses=[i["public_ip"] for i in instances],
            ssh_user=[SSH_USER] * len(instances),
            terraform_state=[self.workspace],
            roles=[i["role"] for i in instances],
            private_ip_addresses=[i["private_ip"] for i in instances],
            cloudwatch_log_group=outputs["cloudwatch_log_group"]["value"],
        )


def generate_ansible_inventory(
    infra: ProvisionedInfrastructure,
    profile: DeploymentProfile,
    inventory_path: Path = DEFAULT_WORKSPACE_ROOT / "inventory.ini",
) -> InventoryReference:
    """Write an Ansible inventory grouping hosts by role, and return a reference to it."""
    key = Path(profile.path_to_ssh_token)
    if key.suffix == ".pub":
        key = key.with_suffix("")

    groups: Dict[str, List[str]] = {}
    host_vars: Dict[str, Dict[str, str]] = {}
    for ip, private_ip, role, user in zip(
        infra.public_ip_addresses, infra.private_ip_addresses, infra.roles, infra.ssh_user
    ):
        # The centralized "all" role hosts every service on one node.
        for group in (ALL_ROLE_GROUPS if role == "all" else (role,)):
            groups.setdefault(group, []).append(ip)
        host_vars[ip] = {
            "role": role,
            "private_ip": private_ip,
            "ansible_user": user,
            "ansible_ssh_private_key_file": str(key),
        }

    # Host variables live on the role-group entries; Ansible's implicit "all" group needs no section.
    lines = []
    for role, ips in groups.items():
        lines += ([""] if lines else []) + [f"[{role}]"]
        for ip in ips:
            lines.append(ip + " " + " ".join(f'{k}="{v}"' for k, v in host_vars[ip].items()))

    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    inventory_path.write_text("\n".join(lines) + "\n")
    return InventoryReference(inventory_path, groups, host_vars)


def provision_and_generate_inventory(
    context: TerraformContext, service: Optional[TerraformProvisioningService] = None,
) -> InventoryReference:
    """Provision the infrastructure described by the context and write its Ansible inventory."""
    service = service or TerraformProvisioningService()
    infra = service.provision(context)
    return generate_ansible_inventory(infra, next(iter(context.config_reference.values())))
