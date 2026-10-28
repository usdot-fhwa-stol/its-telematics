#!/usr/bin/env python3
"""Zero-touch AWS provisioning via Terraform with Ansible inventory generation."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from configuration_service import DEFAULT_WORKSPACE_ROOT
from models import (
    DeploymentProfile,
    InventoryReference,
    ProvisionedInfrastructure,
    TerraformContext,
    TerraformExecutionResult,
)

SSH_USER = "ubuntu"
ALL_ROLE_GROUPS = ("ui", "processing", "database")


class CloudProvisioningService:
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
        """Initialize the working directory, provider plugins, remote backend, and selected workspace.

        The var file is written beforehand by generate_terraform_variables.
        Returns the initialized context.
        """
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
        """Run Terraform validation and planning, record proposed changes, and produce a reusable plan file.

        The plan is written to context.plan_file.
        """
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
        """Apply the approved plan and record whether provisioning completed successfully.

        Applies exactly the saved plan (no re-planning, so no drift).
        """
        if not Path(approved_plan).is_file():
            raise FileNotFoundError(f"Approved plan not found: {approved_plan}")
        result = self._run(context, "apply", "-input=false", str(approved_plan))
        return TerraformExecutionResult(
            result.returncode == 0, Path(approved_plan), [], result.stdout, result.stderr,
        )

    def rollback_infrastructure(self, context: TerraformContext) -> TerraformExecutionResult:
        """Destroy resources created by a failed run so nothing is left running or billed.

        Destroys all resources in the selected workspace, including partially created ones.
        Reports the outcome to the operator and does not raise.
        """
        print("Provisioning failed; destroying the created resources.", file=sys.stderr, flush=True)
        try:
            result = self._run(
                context, "destroy", "-input=false", "-auto-approve", f"-var-file={context.var_file}",
            )
        except OSError as error:
            print(f"Rollback could not run: {error}", file=sys.stderr)
            return TerraformExecutionResult(False, None, [], "", str(error))
        if result.returncode == 0:
            print("Rollback complete: all created resources were destroyed.", flush=True)
        else:
            print(result.stderr, file=sys.stderr)
            print(f"Rollback FAILED. Remove leftovers manually: terraform -chdir={context.root_path} destroy "
                  f"-var-file={context.var_file}", file=sys.stderr, flush=True)
        return TerraformExecutionResult(result.returncode == 0, None, [], result.stdout, result.stderr)

    def read_infrastructure_outputs(
        self, context: TerraformContext, apply_result: TerraformExecutionResult
    ) -> ProvisionedInfrastructure:
        """Read instance identifiers, addresses, security groups, storage information, and other outputs.

        Rejects an apply_result that was not successful.
        """
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

    def provision(self, context: TerraformContext, approved_plan: Optional[Path] = None) -> ProvisionedInfrastructure:
        """Run the full workflow, rolling back if anything fails once the apply has been attempted.

        A failed init or plan changes nothing, so it is reported without a rollback.
        """
        context = self.initialize_terraform(context)
        plan_result = self.generate_infrastructure_plan(context)
        if not plan_result.success:
            raise RuntimeError(f"Terraform validation or planning failed: {plan_result.stderr or plan_result.stdout}")
        print("Proposed infrastructure changes:")
        for change in plan_result.changes or ["(none)"]:
            print(f"  {change}")
        plan = approved_plan or plan_result.plan_file
        if plan is None:
            raise RuntimeError("No plan file available to apply")
        print("Applying the plan.", flush=True)
        try:
            apply_result = self.apply_infrastructure_plan(context, plan)
            print(apply_result.stdout, flush=True)
            if not apply_result.success:
                raise RuntimeError(f"Terraform apply failed: {apply_result.stderr}")
            return self.read_infrastructure_outputs(context, apply_result)
        except Exception:
            self.rollback_infrastructure(context)
            raise


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
