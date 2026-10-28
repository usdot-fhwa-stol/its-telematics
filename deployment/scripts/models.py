from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
DEPLOYMENT_DIR = REPO_ROOT / "deployment"
SYSTEM_RELATIVE_DIR = Path("telematic_system")
SYSTEM_DIR = REPO_ROOT / SYSTEM_RELATIVE_DIR
TERRAFORM_DIR = DEPLOYMENT_DIR / "infra" / "terraform" / "aws"

# Deployment targets
TARGET_LOCALHOST = "localhost"
TARGET_REMOTE = "remote"
TARGET_CLOUD = "cloud"
TARGETS = (TARGET_LOCALHOST, TARGET_REMOTE, TARGET_CLOUD)
LOCAL_TARGET_ALIASES = ("local", TARGET_LOCALHOST)

# Environments
ENVIRONMENT_DEV = "dev"
ENVIRONMENT_TEST = "test"
ENVIRONMENT_PROD = "prod"
ENVIRONMENTS = (ENVIRONMENT_DEV, ENVIRONMENT_TEST, ENVIRONMENT_PROD)

# Use cases
USE_CASE_ALL = "all"
USE_CASE_CORE = "core"
USE_CASE_RSU_INTEGRATION = "rsu_integration"
USE_CASES = (USE_CASE_ALL, USE_CASE_CORE, USE_CASE_RSU_INTEGRATION)

# Node roles: the centralized ROLE_ALL node runs every service role
ROLE_ALL = "all"
ROLE_UI = "ui"
ROLE_PROCESSING = "processing"
ROLE_DATABASE = "database"
SERVICE_ROLES = (ROLE_UI, ROLE_PROCESSING, ROLE_DATABASE)

# Connection transports
CONNECTION_LOCAL = "local"
CONNECTION_SSH = "ssh"


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
        """Path to main.tf in the module directory."""
        return self.root_path / "main.tf"

    @property
    def providers_tf(self) -> Path:
        """Path to providers.tf in the module directory."""
        return self.root_path / "providers.tf"

    @property
    def variables_tf(self) -> Path:
        """Path to variables.tf in the module directory."""
        return self.root_path / "variables.tf"

    @property
    def outputs_tf(self) -> Path:
        """Path to outputs.tf in the module directory."""
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
    ssh_debug_command: str = ""                             # Ready-to-run connection string for troubleshooting


@dataclass
class TerraformExecutionResult:
    """Outcome of a Terraform plan or apply run."""
    success: bool
    plan_file: Optional[Path] = None
    changes: List[str] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    
@dataclass
class InputParameters:
    """Command-line inputs that drive one deployment run.

    target and environment stay None until validate_input_parameters applies their defaults.
    """
    aws_region: str                                # AWS region for cloud provisioning
    target: Optional[str] = None                   # one of TARGETS
    environment: Optional[str] = None              # one of ENVIRONMENTS
    use_case: str = USE_CASE_ALL                   # one of USE_CASES
    remote_io: str = ""                            # remote host address, e.g. "100.57.167.208"
    remote_user: str = ""                          # remote SSH user, e.g. "ubuntu"
    key_path: str = ""                             # e.g. "/home/dev/host_files/wfd-ubuntu.pem"
    distributed: bool = False                      # separate processing, ui, and database nodes
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    secret_overrides: Dict[str, str] = field(default_factory=dict)
    prune_volumes: bool = True                     # remove the stack's Docker volumes before each deployment
    terraform_profiles: Dict[str, DeploymentProfile] = field(default_factory=dict)  # set for the cloud target


@dataclass
class ConfigMap:
    """Resolved configuration values together with the layers and overrides that produced them."""
    entries: Dict[str, str] = field(default_factory=dict)
    source_layers: List[str] = field(default_factory=list)
    override_keys: List[str] = field(default_factory=list)

@dataclass(frozen=True)
class TargetProfile:
    """Immutable description of how to reach one deployment target."""
    target: str                 # Operator-supplied target: localhost, remote, or cloud
    connection: str             # CONNECTION_LOCAL (loopback, no credentials) or CONNECTION_SSH
    address: str
    user: str
    key_path: str = ""          # Absolute path to the SSH private key; empty for local targets
    role: str = ROLE_ALL
    private_ip: str = ""

    @property
    def is_local(self) -> bool:
        """True when the target uses the local loopback connection."""
        return self.connection == CONNECTION_LOCAL


@dataclass(frozen=True)
class CommandResult:
    """Outcome of one Ansible invocation or pipeline step."""
    step: str
    success: bool
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""


@dataclass(frozen=True)
class ExecutionContext:
    """Immutable inputs shared by every phase of the automation pipeline."""
    target_profiles: Tuple[TargetProfile, ...]
    inventory: InventoryReference
    manifest_reference: Dict[str, Any]   # runtime_env_path and compose_manifest_paths, relative to repo_root
    repo_root: Path
    remote_workspace: str = str(SYSTEM_RELATIVE_DIR)  
    startup_timeout_seconds: int = 300
    prune_volumes: bool = True  # remove the stack's Docker volumes before starting
    log_tail_lines: int = 50
    registry_endpoints: Tuple[str, ...] = ("https://registry-1.docker.io/v2/",)


@dataclass(frozen=True)
class TaskExecutionResult:
    """Structured pipeline outcome, including a diagnostic report on failure."""
    success: bool
    completed_steps: Tuple[str, ...] = ()
    failed_step: str = ""
    exit_code: int = 0
    reason: str = ""
    log_trace: str = ""
    remediation_hints: Tuple[str, ...] = ()

    def report(self) -> str:
        """Format the outcome as text.

        Returns:
            A one-line summary on success; otherwise the failed step, exit code, reason,
            remediation hints, and container log trace.
        """
        if self.success:
            return "Deployment completed: " + ", ".join(self.completed_steps)
        lines = [f"Failed step: {self.failed_step}", f"Exit code: {self.exit_code}", f"Reason: {self.reason}"]
        lines += [f"Hint: {hint}" for hint in self.remediation_hints]
        if self.log_trace:
            lines += ["Container log trace:", self.log_trace]
        return "\n".join(lines)
