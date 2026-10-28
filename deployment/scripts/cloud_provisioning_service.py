#!/usr/bin/env python3
"""Zero-touch AWS provisioning via Terraform with Ansible inventory generation."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from models import (
    ProvisionedInfrastructure,
    TerraformContext,
    TerraformExecutionResult,
)

SSH_USER = "ubuntu"


class CloudProvisioningService:
    """Runs the Terraform CLI against the AWS module in deployment/infra/terraform/aws."""

    def __init__(
        self,
        workspace: str = "default",
        backend_config: Optional[Dict[str, str]] = None,
        terraform_bin: str = "terraform",
    ):
        """Configure the Terraform CLI wrapper.

        Args:
            workspace: Terraform workspace to select or create.
            backend_config: Key/value pairs passed to init as -backend-config.
            terraform_bin: Terraform executable name or path.
        """
        self.workspace = workspace
        self.backend_config = backend_config or {}
        self.terraform_bin = terraform_bin

    def _run(self, context: TerraformContext, *args: str) -> subprocess.CompletedProcess:
        """Run a Terraform subcommand in the module directory and capture its output.

        Args:
            context: Terraform context providing the module root path.
            *args: Subcommand and its arguments.

        Returns:
            Completed process; the caller inspects the return code.
        """
        return subprocess.run(
            [self.terraform_bin, f"-chdir={context.root_path}", *args],
            capture_output=True, text=True, check=False,
        )

    def initialize_terraform(self, context: TerraformContext) -> TerraformContext:
        """Initialize the working directory, provider plugins, remote backend, and selected workspace.

        The var file is written beforehand by generate_terraform_variables.

        Args:
            context: Terraform context to initialize.

        Returns:
            The initialized context.

        Raises:
            RuntimeError: If terraform init or workspace selection fails.
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

        Args:
            context: Terraform context providing the var file and plan file paths.

        Returns:
            Result with success, the plan file, human-readable changes (for example
            "create aws_instance.node"), and Terraform output. On a validate or plan
            failure, success is False and no plan file is returned.
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

        Args:
            context: Terraform context for the module.
            approved_plan: Path to the saved plan file to apply.

        Returns:
            Result whose success reflects the apply exit code.

        Raises:
            FileNotFoundError: If the plan file does not exist.
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

        Args:
            context: Terraform context providing the var file used by destroy.

        Returns:
            Result whose success is True only if the destroy completed.
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

        Args:
            context: Terraform context for the module.
            apply_result: Result of the apply step.

        Returns:
            Provisioned infrastructure with parallel lists of ids, addresses, roles and SSH users.

        Raises:
            ValueError: If apply_result was not successful.
            RuntimeError: If terraform output fails.
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

        Args:
            context: Terraform context for the module.
            approved_plan: Plan file to apply instead of the one just generated.

        Returns:
            Provisioned infrastructure read from the Terraform outputs.

        Raises:
            RuntimeError: If init, planning, apply, or reading outputs fails, or no plan exists.
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
