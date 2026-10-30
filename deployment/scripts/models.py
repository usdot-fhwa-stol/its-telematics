from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
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
    """Input specifications defining the EC2 hardware, storage, and networking baseline.

    Attributes:
        instance_type: EC2 instance type.
        ami_id: AMI to boot; empty selects the Terraform default.
        instance_count: Number of instances created for this profile.
        root_volume_size_gib: Root disk size in GiB.
        data_volume_size_gib: Extra data disk size in GiB.
        volume_type: EBS volume type, for example "gp3".
        subnet_id: Subnet to launch in; empty selects the Terraform default.
        security_group_ids: Additional security groups to attach.
        path_to_ssh_token: Path to the .pem private key (or .pub key) used for the nodes.

    Example:
        DeploymentProfile(
            instance_type="t3.xlarge", ami_id="", instance_count=1,
            root_volume_size_gib=50, data_volume_size_gib=100, volume_type="gp3",
            subnet_id="", security_group_ids=[],
            path_to_ssh_token=Path("/home/dev/host_files/wfd-ubuntu.pem"),
        )
    """
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
    """Filesystem boundaries and state files required to run Terraform operations.

    Attributes:
        root_path: Terraform module directory holding main.tf, providers.tf, variables.tf and outputs.tf.
        config_reference: Resolved configuration the variables were generated from (for example a ConfigMap).
        var_file: Generated .tfvars.json file passed to Terraform.
        plan_file: Saved plan file produced by terraform plan and consumed by apply.

    Example:
        TerraformContext(
            root_path=TERRAFORM_DIR, config_reference=ConfigMap(),
            var_file=TERRAFORM_DIR / "terraform.tfvars.json", plan_file=TERRAFORM_DIR / "tfplan",
        )
    """
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
    """Evaluated runtime results output by cloud provisioning.

    Attributes:
        region: AWS region the nodes run in.
        instance_ids: EC2 instance IDs.
        public_ip_addresses: Public IPs, parallel to instance_ids.
        ssh_user: SSH login user per instance.
        terraform_state: Terraform state file locations or identifiers.
        roles: Role per instance (ROLE_ALL, ROLE_UI, ROLE_PROCESSING or ROLE_DATABASE), parallel to instance_ids.
        private_ip_addresses: VPC-internal IPs, parallel to instance_ids; used for service-to-service traffic.
        cloudwatch_log_group: CloudWatch log group collecting the node logs; empty when disabled.

    Example:
        ProvisionedInfrastructure(
            region="us-east-1", instance_ids=["i-0abc123def4567890"],
            public_ip_addresses=["44.202.201.1"], ssh_user=["ubuntu"],
            terraform_state=["terraform.tfstate"], roles=["all"],
            private_ip_addresses=["10.20.0.58"], cloudwatch_log_group="/its-telematics/prod",
        )
    """
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
    """Ansible automation inventory reference consumed by the task automation engine.

    Attributes:
        inventory_file_path: Path of the generated inventory.ini.
        target_groups: Ansible group ("ui", "processing", "database") to the host addresses in it.
        host_variables: Host address to its Ansible variables (role, private_ip, ansible_user, ...).
        ssh_debug_command: Copy-pasteable ssh command for testing the connection by hand.

    Example:
        InventoryReference(
            inventory_file_path=Path("deployment/targets/cloud/inventory.ini"),
            target_groups={"ui": ["44.202.201.1"], "processing": ["44.202.201.1"], "database": ["44.202.201.1"]},
            host_variables={"44.202.201.1": {"role": "all", "private_ip": "10.20.0.58", "ansible_user": "ubuntu"}},
            ssh_debug_command="ssh -i /tmp/its-telematics-ssh-1000/wfd-ubuntu.pem ubuntu@44.202.201.1",
        )
    """
    inventory_file_path: Path
    target_groups: Dict[str, List[str]]                      # Group -> List of Host IPs
    host_variables: Dict[str, Dict[str, str]]               # Host IP -> {ansible_var: value}
    ssh_debug_command: str = ""                             # Ready-to-run connection string for troubleshooting


@dataclass
class TerraformExecutionResult:
    """Outcome of a Terraform plan or apply run.

    Attributes:
        success: True when Terraform exited successfully.
        plan_file: Saved plan file, or None when no plan was produced.
        changes: Human-readable resource changes, for example "+ aws_instance.node[0]".
        stdout: Captured Terraform standard output.
        stderr: Captured Terraform standard error.

    Example:
        TerraformExecutionResult(success=True, plan_file=Path("tfplan"),
                                 changes=["+ aws_instance.node[0]"], stdout="Plan: 1 to add, 0 to change, 0 to destroy.")
    """
    success: bool
    plan_file: Optional[Path] = None
    changes: List[str] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    
@dataclass
class InputParameters:
    """Command-line inputs that drive one deployment run.

    target and environment stay None until validate_input_parameters applies their defaults.

    Attributes:
        aws_region: AWS region for cloud provisioning.
        target: One of TARGETS; defaults to localhost.
        environment: One of ENVIRONMENTS; defaults to prod.
        use_case: One of USE_CASES.
        remote_io: Remote host address for the remote target.
        remote_user: SSH user for the remote target.
        key_path: SSH private (or .pub) key for remote and cloud targets.
        distributed: True to provision separate processing, ui and database nodes (cloud).
        aws_access_key_id: Explicit AWS access key; empty uses the AWS profile.
        aws_secret_access_key: Explicit AWS secret key; empty uses the AWS profile.
        secret_overrides: Secret name to value, applied over the example defaults.
        prune_volumes: Remove the stack's Docker volumes before each deployment.
        terraform_profiles: Node role to DeploymentProfile; set for the cloud target.

    Example:
        InputParameters(
            aws_region="us-east-1", target=TARGET_CLOUD, environment=ENVIRONMENT_PROD,
            use_case=USE_CASE_ALL, key_path="/home/dev/host_files/wfd-ubuntu.pem",
            distributed=False, prune_volumes=True,
        )
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
    """Resolved configuration values together with the layers and overrides that produced them.

    Attributes:
        entries: Final key to value pairs written to the runtime .env.
        source_layers: Layer files applied in order, lowest priority first.
        override_keys: Keys whose base value was replaced by a later layer.

    Example:
        ConfigMap(
            entries={"MYSQL_PORT": "3306", "rsu_server_port": "8083"},
            source_layers=["deployment/config/sample.env", "deployment/targets/cloud/.env"],
            override_keys=["MYSQL_PORT"],
        )
    """
    entries: Dict[str, str] = field(default_factory=dict)
    source_layers: List[str] = field(default_factory=list)
    override_keys: List[str] = field(default_factory=list)

@dataclass(frozen=True)
class TargetProfile:
    """Immutable description of how to reach one deployment target.

    Attributes:
        target: Operator-supplied target: localhost, remote, or cloud.
        connection: CONNECTION_LOCAL (loopback, no credentials) or CONNECTION_SSH.
        address: Host address; the public IP for SSH targets.
        user: Login user.
        key_path: Absolute path to the SSH private key; empty for local targets.
        role: ROLE_ALL for a centralized node, or one of SERVICE_ROLES.
        private_ip: VPC-internal IP used by other nodes; empty when unknown.

    Example:
        TargetProfile(
            target=TARGET_CLOUD, connection=CONNECTION_SSH, address="44.202.201.1", user="ubuntu",
            key_path="/home/dev/host_files/wfd-ubuntu.pem", role=ROLE_ALL, private_ip="10.20.0.58",
        )
    """
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
    """Outcome of one Ansible invocation or pipeline step.

    Attributes:
        step: Pipeline step name, for example "Deploy services".
        success: True when the step completed.
        exit_code: Process exit code; 0 on success.
        stdout: Captured standard output.
        stderr: Captured standard error or the failure reason.

    Example:
        CommandResult(step="Verify operating system", success=True, exit_code=0,
                      stdout="44.202.201.1: Ubuntu 22.04")
    """
    step: str
    success: bool
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""


@dataclass(frozen=True)
class ExecutionContext:
    """Immutable inputs shared by every phase of the automation pipeline.

    Attributes:
        target_profiles: Every node the pipeline deploys to.
        inventory: Generated Ansible inventory reference.
        manifest_reference: runtime_env_path and compose_manifest_paths, relative to repo_root.
        repo_root: Absolute path of the repository checkout.
        remote_workspace: Workspace directory relative to the remote home; local targets use repo_root instead.
        startup_timeout_seconds: Maximum wait for containers to become healthy.
        prune_volumes: Remove the stack's Docker volumes before starting.
        log_tail_lines: Log lines captured per failing container.
        registry_endpoints: Registry URLs probed by the connectivity check.

    Example:
        ExecutionContext(
            target_profiles=(profile,), inventory=inventory_reference,
            manifest_reference={"runtime_env_path": "telematic_system/.env",
                                "compose_manifest_paths": ["telematic_system/docker-compose.yml"]},
            repo_root=REPO_ROOT, startup_timeout_seconds=300, prune_volumes=True, log_tail_lines=50,
        )
    """
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
class LogTrace:
    """Captured container log output.

    Attributes:
        service_name: Service (or group of services) the logs belong to.
        line_count: Number of lines in log_payload.
        log_payload: The log text.
        timestamp_utc: ISO 8601 UTC capture time.
    """
    service_name: str
    line_count: int
    log_payload: str
    timestamp_utc: str

    @classmethod
    def from_text(cls, service_name: str, payload: str) -> "LogTrace":
        """Build a LogTrace stamped with the current UTC time."""
        return cls(service_name, len(payload.splitlines()), payload,
                   datetime.now(timezone.utc).isoformat(timespec="seconds"))


@dataclass(frozen=True)
class DiagnosticReport:
    """Details of the failed task.

    Attributes:
        failed_task_id: Name of the failing step.
        exit_code: Exit code of the failure.
        error_stderr: Concise error output of the failure.
        container_logs: Container logs captured on failure, if any.
        remediation_hints: Suggested fixes for the operator.
    """
    failed_task_id: str
    exit_code: int
    error_stderr: str
    container_logs: Optional[LogTrace] = None
    remediation_hints: Tuple[str, ...] = ()


@dataclass(frozen=True)
class ExecutionSummary:
    """Operator-facing outcome of a deployment run, printed as JSON.

    Attributes:
        overall_status: "SUCCESS" or "FAILED".
        elapsed_time_seconds: Duration of the run in seconds.
        active_services: Names of the running services.
        ui_url: Address of the web UI; None when the deployment failed.
        diagnostics: Failure details; None on success.

    Example:
        ExecutionSummary("SUCCESS", 12.5, ("web_client",), "http://localhost/").to_json()
    """
    overall_status: str
    elapsed_time_seconds: float
    active_services: Tuple[str, ...] = ()
    ui_url: Optional[str] = None
    diagnostics: Optional[DiagnosticReport] = None

    def to_dict(self) -> Dict[str, Any]:
        """Return the summary as nested JSON-serializable dictionaries."""
        return asdict(self)

    def to_json(self) -> str:
        """Return the summary as indented JSON."""
        return json.dumps(self.to_dict(), indent=2)


@dataclass(frozen=True)
class TaskExecutionResult:
    """Structured pipeline outcome, including a diagnostic report on failure.

    Attributes:
        success: True when every step completed.
        completed_steps: Names of the steps that finished, in order.
        failed_step: Name of the failing step; empty on success.
        exit_code: Exit code of the failure; 0 on success.
        reason: Concise failure reason.
        log_trace: Container logs captured on failure; None when not collected.
        remediation_hints: Suggested fixes shown to the operator.
        active_services: Names of the running services after a successful run.

    Example:
        TaskExecutionResult(
            success=False, completed_steps=("Verify operating system",), failed_step="Deploy services",
            exit_code=2, reason="Services still not up after the maximum update attempts.",
            remediation_hints=("Check Docker daemon health: systemctl status docker.",),
        )
    """
    success: bool
    completed_steps: Tuple[str, ...] = ()
    failed_step: str = ""
    exit_code: int = 0
    reason: str = ""
    log_trace: Optional[LogTrace] = None
    remediation_hints: Tuple[str, ...] = ()
    active_services: Tuple[str, ...] = ()

    def summarize(self, elapsed_time_seconds: float, ui_url: Optional[str] = None) -> ExecutionSummary:
        """Convert the outcome to an ExecutionSummary.

        Args:
            elapsed_time_seconds: Duration of the run.
            ui_url: Web UI address, reported only on success.

        Returns:
            Summary with a DiagnosticReport (carrying the LogTrace, if any) on failure.
        """
        elapsed = round(elapsed_time_seconds, 2)
        if self.success:
            return ExecutionSummary("SUCCESS", elapsed, self.active_services, ui_url)
        report = DiagnosticReport(self.failed_step, self.exit_code, self.reason, self.log_trace, self.remediation_hints)
        return ExecutionSummary("FAILED", elapsed, diagnostics=report)
