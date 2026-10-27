#!/usr/bin/env python3
"""Abstract skeleton for Terraform-based cloud provisioning."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from models import ProvisionedInfrastructure, TerraformContext,TerraformExecutionResult



class CloudProvisioningService(ABC):
    """Defines the provisioning workflow; subclasses supply the Terraform behavior."""

    @abstractmethod
    def initialize_terraform(self, context: TerraformContext) -> TerraformContext:
        """Initialize the working directory, provider plugins, remote backend, and selected workspace.

        Returns the initialized context.
        """

    @abstractmethod
    def generate_infrastructure_plan(self, context: TerraformContext) -> TerraformExecutionResult:
        """Run Terraform validation and planning, record proposed changes, and produce a reusable plan file."""

    @abstractmethod
    def apply_infrastructure_plan(
        self, context: TerraformContext, approved_plan: Path
    ) -> TerraformExecutionResult:
        """Apply the approved plan and record whether provisioning completed successfully."""

    @abstractmethod
    def read_infrastructure_outputs(
        self, context: TerraformContext, apply_result: TerraformExecutionResult
    ) -> ProvisionedInfrastructure:
        """Read instance identifiers, addresses, security groups, storage information, and other outputs.

        Implementations must reject an apply_result that was not successful.
        """

    @abstractmethod
    def destroy_infrastructure(self, context: TerraformContext) -> TerraformExecutionResult:
        """Destroy every resource tracked in the current state; used to roll back a failed provisioning run."""

    def provision(self, context: TerraformContext, approved_plan: Optional[Path] = None) -> ProvisionedInfrastructure:
        """Run the full workflow. Applies the generated plan only if an approved plan is given or the plan succeeds."""
        context = self.initialize_terraform(context)
        plan_result = self.generate_infrastructure_plan(context)
        if not plan_result.success:
            raise RuntimeError("Terraform plan failed")
        plan = approved_plan or plan_result.plan_file
        if plan is None:
            raise RuntimeError("No plan file available to apply")
        try:
            apply_result = self.apply_infrastructure_plan(context, plan)
            if not apply_result.success:
                raise RuntimeError("Terraform apply failed")
            return self.read_infrastructure_outputs(context, apply_result)
        except Exception:
            # Nothing is left half-provisioned once an apply has been attempted.
            self.destroy_infrastructure(context)
            raise
