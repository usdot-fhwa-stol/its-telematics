#!/usr/bin/env python3
"""Run the ITS Telematics deployment workflow."""

import argparse
import configparser
import contextlib
from dataclasses import asdict
import io
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import sys
import time

from configuration_service import generate_terraform_variables, DEFAULT_AWS_REGION
from models import (
    ENVIRONMENT_PROD,
    ENVIRONMENTS,
    REPO_ROOT,
    ROLE_ALL,
    ROLE_DATABASE,
    ROLE_PROCESSING,
    ROLE_UI,
    TARGET_CLOUD,
    TARGET_LOCALHOST,
    TARGET_REMOTE,
    TARGETS,
    USE_CASE_ALL,
    USE_CASES,
    DeploymentProfile,
    InputParameters,
)
from cloud_provisioning_service import CloudProvisioningService
from host_preparation_service import PLAYBOOK as HOST_PREPARATION_PLAYBOOK
from inventory_synthesizer import InventorySynthesizer
from task_automation_service import TaskAutomationService


SCRIPT_DIR = Path(__file__).resolve().parent
CONFIGURATION_SERVICE = SCRIPT_DIR / "configuration_service.py"
SECRET_KEYS = (
    "mysql_password",
    "mysql_root_password",
    "grafana_secret_key",
    "influx_admin_token",
)


ROOT_VOLUME_GIB = 100
VOLUME_TYPE = "gp3"
# role -> instance type; the centralized ROLE_ALL role runs ui, processing, and database on one node
CENTRALIZED_ROLES = {ROLE_ALL: "m5n.8xlarge"}
DISTRIBUTED_ROLES = {
    ROLE_PROCESSING: "m5n.8xlarge",
    ROLE_UI: "t2.2xlarge",
    ROLE_DATABASE: "t2.large",
}


def resolve_aws_credentials_file():
    """Locate the shared AWS credentials file of the user who invoked the script.

    Under "sudo python3 setup.py" HOME is /root, so the invoking user (SUDO_USER) is used instead.
    AWS_SHARED_CREDENTIALS_FILE takes precedence when set.

    Returns:
        Path to the credentials file (it may not exist).
    """
    configured = os.environ.get("AWS_SHARED_CREDENTIALS_FILE")
    if configured:
        return Path(configured).expanduser()
    invoking_user = os.environ.get("SUDO_USER")
    if invoking_user and invoking_user != "root":
        try:
            return Path(pwd.getpwnam(invoking_user).pw_dir) / ".aws" / "credentials"
        except KeyError:
            pass
    return Path.home() / ".aws" / "credentials"


AWS_CREDENTIALS_FILE = resolve_aws_credentials_file()
# Terraform and the AWS provider run as child processes; make them read the same file.
os.environ.setdefault("AWS_SHARED_CREDENTIALS_FILE", str(AWS_CREDENTIALS_FILE))


class DeploymentError(Exception):
    """Operator-facing failure carrying the process exit code to use."""

    def __init__(self, message, exit_code=2):
        """Store an operator-safe error message and its process exit code.

        Args:
            message: Message safe to print (must not contain secrets).
            exit_code: Process exit code for this failure.
        """
        super().__init__(message)
        self.exit_code = exit_code


class DeploymentArgumentParser(argparse.ArgumentParser):
    """ArgumentParser that never echoes raw argument values, which may be secrets."""

    def error(self, message):
        """Reject invalid CLI input without echoing potentially secret argument values.

        Args:
            message: argparse's message; intentionally not printed.
        """
        # argparse's original message can contain raw arguments, including secrets.
        self.print_usage(sys.stderr)
        self.exit(2, "error: invalid command-line input; review --help and supported values.\n")


class ListOptionsAction(argparse.Action):
    """Prints the supported options as JSON for tools such as the deployment UI, then exits."""

    def __init__(self, option_strings, dest, **kwargs):
        """Take no value, like --help, and leave no attribute on the parsed arguments."""
        super().__init__(option_strings, dest, nargs=0, default=argparse.SUPPRESS, **kwargs)

    def __call__(self, parser, namespace, values, option_string=None):
        """Print the listing and exit, reporting the defaults a run would use."""
        defaults = argparse.Namespace(**{
            action.dest: action.default for action in parser._actions
            if action.default is not argparse.SUPPRESS
        })
        # Omitted environment and target values are resolved during validation; reuse it so the
        # listing reports the defaults a run would use. Its default notices are not printed.
        with contextlib.redirect_stdout(io.StringIO()):
            validate_input_parameters(defaults)
        options = []
        for action in parser._actions:
            if action.default is argparse.SUPPRESS:
                continue  # --help and --list-options
            option = {
                "name": action.option_strings[0],
                "choices": list(action.choices) if action.choices else None,
                "default": getattr(defaults, action.dest),
                "repeatable": isinstance(action, argparse._AppendAction),
                "metavar": action.metavar,
                "help": action.help,
            }
            if action.dest == "secret_override":
                option["keys"] = list(SECRET_KEYS)
            options.append(option)
        json.dump({"schema_version": 1, "description": parser.description, "options": options},
                  sys.stdout, indent=2)
        print(flush=True)
        parser.exit(0)


def read_secret_overrides_from_stdin():
    """Read {"key": "value"} secret overrides from standard input, keeping values off the command line.

    Returns:
        Dict of secret key to value.

    Raises:
        DeploymentError: If standard input is missing, is not a JSON object of strings, or uses an
            unsupported key.
    """
    if sys.stdin is None:
        raise DeploymentError("--secret-overrides-stdin requires standard input.")
    if sys.stdin.isatty():
        print("Reading secret overrides from standard input as JSON; end with Ctrl-D.",
              file=sys.stderr, flush=True)
    try:
        overrides = json.loads(sys.stdin.read() or "{}")
    except ValueError:
        # The JSON error message can quote the input, which holds secrets.
        raise DeploymentError("--secret-overrides-stdin requires a JSON object on standard input.") from None
    if not isinstance(overrides, dict) or not all(isinstance(value, str) for value in overrides.values()):
        raise DeploymentError("--secret-overrides-stdin requires a JSON object with string values.")
    if any(key not in SECRET_KEYS for key in overrides):
        raise DeploymentError("Unsupported secret key; supported keys: " + ", ".join(SECRET_KEYS))
    return overrides


def parse_input_parameters() -> InputParameters:
    """Parse bounded CLI options and collect supported secret overrides without logging values.

    Returns:
        InputParameters built from the CLI options, with secret_overrides as a dict of key to value.

    Raises:
        DeploymentError: If a --secret-override is malformed or uses an unsupported key.
    """
    parser = DeploymentArgumentParser(
        description="Run the ITS Telematics deployment workflow.",
        allow_abbrev=False,
        epilog=(
            "Environment profile files under deployment/environment/ are the source "
            "of truth for Docker organization and image tag selection."
        ),
    )
    # Resolve omitted defaults during validation so --help prints no default notices.
    parser.add_argument("--environment", choices=ENVIRONMENTS,
                        help=f"Deployment environment (default: {ENVIRONMENT_PROD})")
    parser.add_argument("--target", choices=TARGETS,
                        help=f"Deployment target (default: {TARGET_LOCALHOST})")
    parser.add_argument("--use-case", choices=USE_CASES, default=USE_CASE_ALL,
                        help=f"Optional use case (default: {USE_CASE_ALL}); {USE_CASE_ALL} enables every service")
    parser.add_argument("--remote-io", default="", help="Remote host address or endpoint")
    parser.add_argument("--remote-user", default="", help="Remote connection user")
    parser.add_argument("--key-path", default="", help="Existing readable credential key file")
    topology = parser.add_mutually_exclusive_group()
    topology.add_argument("--distributed", action="store_true",
                          help="Distributed topology: separate processing, ui, and database nodes")
    topology.add_argument("--centralized", action="store_true",
                          help="Centralized topology: one node running ui, processing, and database (default)")
    parser.add_argument("--aws-access-key-id", default="",
                        help="AWS access key ID saved to the default profile when it does not exist (cloud target)")
    parser.add_argument("--aws-secret-access-key", default="",
                        help="AWS secret access key saved to the default profile (cloud target)")
    parser.add_argument("--aws-region", default=DEFAULT_AWS_REGION,
                        help="AWS region for cloud provisioning (default: %(default)s)")
    parser.add_argument(
        "--secret-override", action="append", default=[], metavar="key=value",
        help="Repeatable; last value wins. Supported keys: " + ", ".join(SECRET_KEYS),
    )
    parser.add_argument(
        "--secret-overrides-stdin", action="store_true",
        help="Also read secret overrides from standard input as a JSON object of key: value, so values "
             "never appear on the command line; a --secret-override for the same key wins",
    )
    parser.add_argument(
        "--volume-prune", action=argparse.BooleanOptionalAction, default=True,
        help="Remove the stack's Docker volumes before each deployment (default: enabled; "
             "use --no-volume-prune to keep existing data)",
    )
    parser.add_argument("--list-options", action=ListOptionsAction,
                        help="Print the supported options, choices, defaults and help as JSON, then exit")
    arguments = parser.parse_args()
    overrides = {}
    for override in arguments.secret_override:
        key, separator, value = override.partition("=")
        if not separator or not key:
            raise DeploymentError("--secret-override requires key=value with a non-empty key.")
        if key not in SECRET_KEYS:
            raise DeploymentError("Unsupported secret key; supported keys: " + ", ".join(SECRET_KEYS))
        overrides[key] = value
    if arguments.secret_overrides_stdin:
        overrides = {**read_secret_overrides_from_stdin(), **overrides}
    parameters = InputParameters(
        aws_region=arguments.aws_region,
        target=arguments.target,
        environment=arguments.environment,
        use_case=arguments.use_case,
        remote_io=arguments.remote_io,
        remote_user=arguments.remote_user,
        key_path=arguments.key_path,
        distributed=arguments.distributed,
        aws_access_key_id=arguments.aws_access_key_id,
        aws_secret_access_key=arguments.aws_secret_access_key,
        secret_overrides=overrides,
        prune_volumes=arguments.volume_prune,
    )
    return parameters


def validate_input_parameters(parameters: InputParameters):
    """Apply omitted defaults and validate required remote inputs and optional key-file access.

    Args:
        parameters: Input parameters; environment and target defaults are set in place.

    Raises:
        DeploymentError: Listing every violated requirement (remote inputs, cloud key, Terraform,
            AWS credentials, or an unreadable key file).
    """
    if parameters.environment is None:
        parameters.environment = ENVIRONMENT_PROD
        print(f"No environment specified. Defaulting to '{ENVIRONMENT_PROD}'.", flush=True)
    if parameters.target is None:
        parameters.target = TARGET_LOCALHOST
        print(f"No target specified. Defaulting to '{TARGET_LOCALHOST}'.", flush=True)

    errors = []
    if parameters.target == TARGET_REMOTE:
        if not parameters.remote_io:
            errors.append("--remote-io is required for target remote.")
        if not parameters.remote_user:
            errors.append("--remote-user is required for target remote.")
    if parameters.target == TARGET_CLOUD and not parameters.key_path:
        errors.append("--key-path (SSH public key) is required for target cloud.")
    if parameters.target == TARGET_CLOUD:
        has_key_id = bool(parameters.aws_access_key_id)
        has_secret = bool(parameters.aws_secret_access_key)
        if has_key_id != has_secret:
            errors.append("--aws-access-key-id and --aws-secret-access-key must be provided together.")
        elif not has_key_id and not aws_default_profile_exists():
            errors.append("AWS default profile not found; provide --aws-access-key-id and --aws-secret-access-key.")
    if parameters.key_path:
        key_path = Path(parameters.key_path)
        if not key_path.is_file() or not os.access(key_path, os.R_OK):
            errors.append("--key-path must refer to an existing readable file.")
    if errors:
        raise DeploymentError("\nerror: ".join(errors))


def build_terraform_profile(key_path, is_distributed):
    """Create one DeploymentProfile per node role; empty ami_id/subnet_id are auto-discovered by Terraform.

    Args:
        key_path: Path to the SSH key used for the nodes.
        is_distributed: True for separate processing, ui, and database nodes; False for one node.

    Returns:
        Dict mapping each role to its DeploymentProfile.
    """
    roles = DISTRIBUTED_ROLES if is_distributed else CENTRALIZED_ROLES
    return {
        role: DeploymentProfile(
            instance_type=instance_type,
            ami_id="",
            instance_count=1,
            root_volume_size_gib=ROOT_VOLUME_GIB,
            data_volume_size_gib=0,
            volume_type=VOLUME_TYPE,
            subnet_id="",
            security_group_ids=[],
            path_to_ssh_token=Path(key_path).expanduser(),
        )
        for role, instance_type in roles.items()
    }


def aws_default_profile_exists():
    """Return whether the shared credentials file holds a complete default profile.

    Returns:
        True if aws_access_key_id and aws_secret_access_key exist in [default]; False otherwise.
    """
    credentials = configparser.RawConfigParser()
    try:
        credentials.read(AWS_CREDENTIALS_FILE)
    except configparser.Error:
        return False
    return (credentials.has_option("default", "aws_access_key_id")
            and credentials.has_option("default", "aws_secret_access_key"))


def save_aws_default_profile(parameters: InputParameters):
    """Persist supplied AWS credentials to the default profile with owner-only permissions.

    Args:
        parameters: Input parameters; nothing is written when no access key ID was supplied.

    Raises:
        DeploymentError: If the credentials file cannot be written.
    """
    if not parameters.aws_access_key_id:
        return
    credentials = configparser.RawConfigParser()
    credentials.read(AWS_CREDENTIALS_FILE)
    if not credentials.has_section("default"):
        credentials.add_section("default")
    credentials.set("default", "aws_access_key_id", parameters.aws_access_key_id)
    credentials.set("default", "aws_secret_access_key", parameters.aws_secret_access_key)
    try:
        AWS_CREDENTIALS_FILE.parent.mkdir(parents=True, exist_ok=True)
        descriptor = os.open(AWS_CREDENTIALS_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w") as handle:
            credentials.write(handle)
        os.chmod(AWS_CREDENTIALS_FILE, 0o600)
        owner = os.environ.get("SUDO_USER")
        if owner and os.geteuid() == 0 and owner != "root":
            # Keep the file owned by the invoking user rather than root.
            shutil.chown(AWS_CREDENTIALS_FILE, user=owner)
            shutil.chown(AWS_CREDENTIALS_FILE.parent, user=owner)
    except OSError:
        raise DeploymentError("Could not save the AWS default profile; check file permissions.") from None
    print("AWS default profile: saved", flush=True)


def validate_host_prerequisites(parameters: InputParameters):
    """Check that the machine running this script can drive the deployment, before any state change.

    Applies to every target. Ansible (installed here if missing), PyYAML, and the host preparation playbook are needed on this
    machine; a cloud target also needs Terraform, which is installed here if missing; remote and cloud targets also need the ssh client, and a localhost target needs root
    or sudo privileges because Ansible then changes this machine. Sudo authentication is requested
    immediately before host preparation. The target operating system is
    verified later by the pipeline's OS check.

    Args:
        parameters: Input parameters; only the target is used.

    Raises:
        DeploymentError: Listing every missing prerequisite.
    """
    errors = []
    if shutil.which("ansible") is None or shutil.which("ansible-playbook") is None:
        print("error: Ansible is not installed or not in PATH; installing it now.", file=sys.stderr, flush=True)
        install_ansible()
    try:
        import yaml  # noqa: F401  (used by the container orchestrator to read compose manifests)
    except ImportError:
        errors.append("The PyYAML package is required; install it with 'pip install pyyaml'.")
    if parameters.target == TARGET_CLOUD and shutil.which("terraform") is None:
        print("error: Terraform is not installed or not in PATH; installing it now.", file=sys.stderr, flush=True)
        install_terraform()
    if not HOST_PREPARATION_PLAYBOOK.is_file():
        errors.append(f"Host preparation playbook is missing: {HOST_PREPARATION_PLAYBOOK}")

    if parameters.target != TARGET_LOCALHOST:
        if shutil.which("ssh") is None:
            errors.append("The ssh client is not installed or not in PATH.")
    elif os.geteuid() != 0:
        if shutil.which("sudo") is None:
            errors.append("Localhost deployment requires root privileges or sudo.")
    if errors:
        raise DeploymentError("\nerror: ".join(errors))
    print("Host prerequisites validation: PASS", flush=True)


def install_apt_packages(name, executables, steps, manual_url):
    """Run apt installation steps through bash, then confirm the executables are in PATH.

    Args:
        name: Product name used in messages.
        executables: Executables that must be in PATH after the install.
        steps: Shell commands, each containing {sudo} where privileges are needed; joined with &&.
        manual_url: Where the operator can find manual installation instructions.

    Raises:
        DeploymentError: If apt-get is unavailable, sudo is needed but missing, the install fails,
            or an executable is still not in PATH afterwards.
    """
    manual = f"Install it manually from {manual_url} and rerun."
    if shutil.which("apt-get") is None:
        raise DeploymentError(f"Automatic {name} installation supports apt-based systems only. {manual}")
    if os.geteuid() != 0 and shutil.which("sudo") is None:
        raise DeploymentError(f"Installing {name} requires root privileges or sudo. {manual}")
    sudo = "" if os.geteuid() == 0 else "sudo"
    try:
        run_command(["bash", "-c", " && ".join(step.format(sudo=sudo) for step in steps)])
    except DeploymentError as error:
        raise DeploymentError(f"{name} installation failed. {manual}", error.exit_code) from None
    if any(shutil.which(executable) is None for executable in executables):
        raise DeploymentError(f"{name} is still not in PATH after installation. {manual}")
    print(f"{name} installation: OK", flush=True)


def install_ansible():
    """Install Ansible from the distribution's apt repositories on this Debian/Ubuntu machine."""
    install_apt_packages(
        "Ansible", ("ansible", "ansible-playbook"),
        # --reinstall restores executables deleted from a package apt still considers installed.
        ["{sudo} apt-get update", "{sudo} apt-get install -y --reinstall ansible-core ansible"],
        "https://docs.ansible.com/ansible/latest/installation_guide/",
    )


def install_terraform():
    """Install Terraform from the HashiCorp apt repository on this Debian/Ubuntu machine."""
    install_apt_packages(
        "Terraform", ("terraform",),
        [
            "{sudo} apt-get update",
            "{sudo} apt-get install -y gnupg curl lsb-release ca-certificates",
            "curl -fsSL https://apt.releases.hashicorp.com/gpg | {sudo} gpg --batch --yes --dearmor "
            "-o /usr/share/keyrings/hashicorp.gpg",
            'echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com '
            '$(lsb_release -cs) main" | {sudo} tee /etc/apt/sources.list.d/hashicorp.list > /dev/null',
            "{sudo} apt-get update",
            "{sudo} apt-get install -y terraform",
        ],
        "https://developer.hashicorp.com/terraform/install",
    )


def run_command(command, env=None):
    """Run a child process and preserve failure codes without exposing commands or environment.

    Args:
        command: Argument list to execute.
        env: Environment for the child process; defaults to the current environment.

    Raises:
        DeploymentError: If the program is missing (127), cannot be executed (126), receives
            invalid input, or exits nonzero (its exit code, or 128 plus the signal number).
    """
    try:
        result = subprocess.run(command, env=env, check=False)
    except FileNotFoundError:
        raise DeploymentError("Required executable was not found.", 127) from None
    except OSError:
        raise DeploymentError("Could not execute the required program; check permissions.", 126) from None
    except ValueError:
        raise DeploymentError("Invalid input for the required program.") from None
    if result.returncode:
        code = result.returncode if result.returncode > 0 else 128 - result.returncode
        raise DeploymentError("Required program failed; review its preceding output.", code)


def generate_deployment_configuration(parameters: InputParameters):
    """Display non-secret context and pass resolved inputs to the Python configuration service.

    Args:
        parameters: Input parameters; terraform_profiles must be set for the cloud target.

    Raises:
        DeploymentError: If the configuration service fails.
    """
    print("Deployment configuration:")
    print(f"  environment : {parameters.environment}")
    print(f"  target      : {parameters.target}")
    print(f"  use case    : {parameters.use_case}")
    print(flush=True)

    environment = os.environ.copy()
    environment.update({
        "ENVIRONMENT": parameters.environment,
        "TARGET": parameters.target,
        "USE_CASE": parameters.use_case,
        "REMOTE_IO": parameters.remote_io,
        "REMOTE_USER": parameters.remote_user,
        "KEY_PATH": parameters.key_path,
        "AWS_REGION": parameters.aws_region,
    })
    if parameters.target == TARGET_CLOUD:
        environment["TERRAFORM_PROFILES"] = json.dumps(
            {role: asdict(profile) for role, profile in parameters.terraform_profiles.items()},
            default=str,
        )
    for key in SECRET_KEYS:
        environment[f"{key.upper()}_OVERRIDE"] = parameters.secret_overrides.get(key, "")
    run_command(
        [sys.executable, str(CONFIGURATION_SERVICE)],
        env=environment,
    )


def provision_cloud_infrastructure(parameters: InputParameters):
    """Provision through the cloud service (which rolls back on failure), then write the cloud inventory.

    Every stage runs through run_step. If the inventory cannot be generated after provisioning
    succeeded, the created infrastructure is destroyed.

    Args:
        parameters: Input parameters with terraform_profiles, aws_region, and key_path.

    Returns:
        Tuple of the InventoryReference and the resolved TargetProfile list.

    Raises:
        SystemExit: If any stage fails.
    """
    try:
        service = CloudProvisioningService()
        context = run_step("Generate Terraform variables", generate_terraform_variables,
                       parameters.terraform_profiles, parameters.aws_region)
        infrastructure = run_step("Provision cloud infrastructure", service.provision, context)
        synthesizer = InventorySynthesizer(
            parameters.target, key_path=parameters.key_path, infrastructure=infrastructure,
            inventory_path=context.var_file.parent / "inventory.ini",
        )
        inventory = run_step("Generate inventory", synthesizer.generate_execution_inventory)
    except SystemExit:
        service.rollback_infrastructure(context)
        raise
    return inventory, synthesizer.target_profiles


def execute_deployment_pipeline(parameters: InputParameters):
    """Run every deployment stage for the selected target, in order.

    Stages: AWS profile and Terraform profiles (cloud only), configuration generation, cloud
    provisioning (cloud only), inventory generation, and the Ansible-driven automation plan.

    Args:
        parameters: Validated input parameters.

    Raises:
        SystemExit: With the failing stage's exit code if any stage or pipeline step fails.
    """
    if parameters.target == TARGET_CLOUD:
        run_step("Save AWS profile", save_aws_default_profile, parameters)
        parameters.terraform_profiles = build_terraform_profile(parameters.key_path, parameters.distributed)
    run_step("Generate deployment configuration", generate_deployment_configuration, parameters)

    if parameters.target == TARGET_CLOUD:
        inventory, target_profiles = provision_cloud_infrastructure(parameters)
    else:
        synthesizer = InventorySynthesizer(
            parameters.target, parameters.remote_io, parameters.remote_user, parameters.key_path,
        )
        inventory = run_step("Generate inventory", synthesizer.generate_execution_inventory)
        target_profiles = synthesizer.target_profiles
    print(f"Ansible inventory: {inventory.inventory_file_path}", flush=True)
    print(f"SSH debug connection: {inventory.ssh_debug_command}", flush=True)

    started = time.monotonic()
    automation = TaskAutomationService(REPO_ROOT, prune_volumes=parameters.prune_volumes)
    run_step("Initialize execution context", automation.initialize_execution_context, target_profiles, inventory)
    result = run_step("Run automated deployment", automation.dispatch_automation_plan)
    ui_url = None
    if result.success:
        ui_hosts = inventory.target_groups.get("ui") or [target_profiles[0].address]
        host = "localhost" if parameters.target == TARGET_LOCALHOST else ui_hosts[0]
        ui_url = f"http://{host}/"
    summary = result.summarize(time.monotonic() - started, ui_url)
    if not result.success:
        print(summary.to_json(), file=sys.stderr, flush=True)
        raise SystemExit(result.exit_code)
    print(summary.to_json(), flush=True)
    print(f"\nOpen the UI: {ui_url}", flush=True)


def display_troubleshooting_hints(failed_step, exit_code):
    """Print the failed stage, original exit code, and a stage-specific remediation hint.

    Args:
        failed_step: Name of the stage that failed.
        exit_code: Exit code reported by the failure.
    """
    hints = {
        "Parse input parameters": "Review --help, option names, and required option values.",
        "Validate input parameters": (
            "Review --help and supported environment/target/use-case values, remote inputs, "
            "and key-file access."
        ),
        "Validate host prerequisites": "Install Ansible, PyYAML, and the ssh client on this machine; for localhost also provide root or sudo privileges.",
        "Verify runtime dependencies": "Verify Docker daemon access and Docker Compose availability; dependency installation belongs to Ansible Host Provisioning.",
        "Save AWS profile": "Check write permissions for the AWS shared credentials file.",
        "Provision cloud infrastructure": "Review the Terraform output above, AWS credentials and permissions, and that terraform is installed.",
        "Initialize execution context": "Review the resolved targets and inventory reference.",
        "Generate inventory": "Verify --remote-io, --remote-user, and that --key-path is a readable private key.",
        "Execute deployment pipeline": "Review the diagnostic report and remediation hints printed above.",
        "Run automated deployment": "Review the failed pipeline step and its remediation hints above.",
        "Generate deployment configuration": "Review configuration layers, secret defaults/overrides, and file paths.",
    }
    print(f"Deployment failed at step: {failed_step}", file=sys.stderr)
    print(f"Exit code: {exit_code}", file=sys.stderr)
    print(f"Hint: {hints.get(failed_step, 'Review the preceding error messages.')}", file=sys.stderr)


def run_step(name, function, *args):
    """Execute a named stage and supplement failures with diagnostics; allow normal help exits.

    Args:
        name: Stage name used for troubleshooting hints.
        function: Callable to run.
        *args: Positional arguments passed to the callable.

    Returns:
        The callable's return value.

    Raises:
        SystemExit: With the failure's exit code (2 for runtime, value, OS, or key errors).
    """
    try:
        return function(*args)
    except DeploymentError as error:
        print(f"error: {error}", file=sys.stderr)
        display_troubleshooting_hints(name, error.exit_code)
        raise SystemExit(error.exit_code) from None
    except (RuntimeError, ValueError, OSError, KeyError) as error:
        print(f"error: {error}", file=sys.stderr)
        display_troubleshooting_hints(name, 2)
        raise SystemExit(2) from None
    except SystemExit as error:
        if error.code:
            display_troubleshooting_hints(name, error.code)
        raise


def main():
    """Parse and validate inputs, then run the deployment pipeline."""
    parameters = run_step("Parse input parameters", parse_input_parameters)
    run_step("Validate input parameters", validate_input_parameters, parameters)
    run_step("Validate host prerequisites", validate_host_prerequisites, parameters)
    run_step("Execute deployment pipeline", execute_deployment_pipeline, parameters)


if __name__ == "__main__":
    main()
