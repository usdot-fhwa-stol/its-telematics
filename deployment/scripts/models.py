from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class DeploymentProfile:
    """Input specifications defining the EC2 hardware, storage, and networking baseline."""
    instance_type: str
    ami_id: str
    instance_count: int
    root_volume_size_gib: int
    data_volume_size_gib: int
    volume_type: str
    subnet_id: str
    security_group_ids: List[str]
    path_to_ssh_token: Path  # Path to the .pem private key file


@dataclass
class TerraformContext:
    """Filesystem boundaries and state files required to run Terraform operations."""
    root_path: Path
    config_reference: Any
    var_file: Path
    plan_file: Path

    # Computed file path references within the root directory
    @property
    def main_tf(self) -> Path:
        return self.root_path / "main.tf"

    @property
    def providers_tf(self) -> Path:
        return self.root_path / "providers.tf"

    @property
    def variables_tf(self) -> Path:
        return self.root_path / "variables.tf"

    @property
    def outputs_tf(self) -> Path:
        return self.root_path / "outputs.tf"


@dataclass
class ProvisionedInfrastructure:
    """Evaluated runtime results output by cloud provisioning."""
    region: str
    instance_ids: List[str]
    public_ip_addresses: List[str]
    ssh_user: List[str]
    terraform_state: List[str]
    roles: List[str] = field(default_factory=list)  # Parallel to instance_ids
    private_ip_addresses: List[str] = field(default_factory=list)
    cloudwatch_log_group: str = ""


@dataclass
class InventoryReference:
    """Ansible automation inventory reference consumed by the task automation engine."""
    inventory_file_path: Path
    target_groups: Dict[str, List[str]]                      # Group -> List of Host IPs
    host_variables: Dict[str, Dict[str, str]]               # Host IP -> {ansible_var: value}


@dataclass
class TerraformExecutionResult:
    """Outcome of a Terraform plan or apply run."""
    success: bool
    plan_file: Optional[Path] = None
    changes: List[str] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
