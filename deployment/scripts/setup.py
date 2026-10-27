#!/usr/bin/env python3
"""Run the ITS Telematics deployment workflow."""

import argparse
import configparser
from dataclasses import asdict
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys

from configuration_service import generate_terraform_variables, DEFAULT_AWS_REGION
from models import DeploymentProfile
from terraform_provisioning_service import TerraformProvisioningService, generate_ansible_inventory


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
LOCAL_SETUP = SCRIPT_DIR / "local.setup.sh"
CONFIGURATION_SERVICE = SCRIPT_DIR / "configuration_service.py"
SECRET_KEYS = (
    "mysql_password",
    "mysql_root_password",
    "grafana_secret_key",
    "influx_admin_token",
)


ROOT_VOLUME_GIB = 100
VOLUME_TYPE = "gp3"
# role -> instance type; the centralized "all" role runs ui, processing, and database on one node
CENTRALIZED_ROLES = {"all": "m5n.8xlarge"}
DISTRIBUTED_ROLES = {
    "processing": "m5n.8xlarge",
    "ui": "t2.2xlarge",
    "database": "t2.large",
}


AWS_CREDENTIALS_FILE = Path(
    os.environ.get("AWS_SHARED_CREDENTIALS_FILE", Path.home() / ".aws" / "credentials")
)


class DeploymentError(Exception):
    def __init__(self, message, exit_code=2):
        """Store an operator-safe error message and its process exit code."""
        super().__init__(message)
        self.exit_code = exit_code


class DeploymentArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        """Reject invalid CLI input without echoing potentially secret argument values."""
        # argparse's original message can contain raw arguments, including secrets.
        self.print_usage(sys.stderr)
        self.exit(2, "error: invalid command-line input; review --help and supported values.\n")


def parse_input_parameters():
    """Parse bounded CLI options and collect supported secret overrides without logging values."""
    parser = DeploymentArgumentParser(
        description="Run the ITS Telematics deployment workflow.",
        allow_abbrev=False,
        epilog=(
            "Environment profile files under deployment/environment/ are the source "
            "of truth for Docker organization and image tag selection."
        ),
    )
    # Resolve omitted defaults during validation so --help prints no default notices.
    parser.add_argument("--environment", choices=("dev", "test", "prod"),
                        help="Deployment environment (default: prod)")
    parser.add_argument("--target", choices=("localhost", "remote", "cloud"),
                        help="Deployment target (default: localhost)")
    parser.add_argument("--use-case", choices=("all", "core", "rsu_integration"), default="all",
                        help="Optional use case (default: all); all enables every service")
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
    parameters = parser.parse_args()
    overrides = {}
    for override in parameters.secret_override:
        key, separator, value = override.partition("=")
        if not separator or not key:
            raise DeploymentError("--secret-override requires key=value with a non-empty key.")
        if key not in SECRET_KEYS:
            raise DeploymentError("Unsupported secret key; supported keys: " + ", ".join(SECRET_KEYS))
        overrides[key] = value
    parameters.secret_overrides = overrides
    del parameters.secret_override
    return parameters


def validate_input_parameters(parameters):
    """Apply omitted defaults and validate required remote inputs and optional key-file access."""
    if parameters.environment is None:
        parameters.environment = "prod"
        print("No environment specified. Defaulting to 'prod'.", flush=True)
    if parameters.target is None:
        parameters.target = "localhost"
        print("No target specified. Defaulting to 'localhost'.", flush=True)

    errors = []
    if parameters.target == "remote":
        if not parameters.remote_io:
            errors.append("--remote-io is required for target remote.")
        if not parameters.remote_user:
            errors.append("--remote-user is required for target remote.")
    if parameters.target == "cloud" and not parameters.key_path:
        errors.append("--key-path (SSH public key) is required for target cloud.")
    if parameters.target == "cloud":
        if shutil.which("terraform") is None:
            errors.append(
                "Terraform is not installed or not in PATH. Install it from "
                "https://developer.hashicorp.com/terraform/install (Ubuntu/Debian: add the HashiCorp apt "
                "repository, then 'sudo apt-get install terraform') and rerun."
            )
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
    """Create one DeploymentProfile per node role; empty ami_id/subnet_id are auto-discovered by Terraform."""
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
    """Return whether the shared credentials file holds a complete default profile."""
    credentials = configparser.RawConfigParser()
    try:
        credentials.read(AWS_CREDENTIALS_FILE)
    except configparser.Error:
        return False
    return (credentials.has_option("default", "aws_access_key_id")
            and credentials.has_option("default", "aws_secret_access_key"))


def save_aws_default_profile(parameters):
    """Persist supplied AWS credentials to the default profile with owner-only permissions."""
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
    except OSError:
        raise DeploymentError("Could not save the AWS default profile; check file permissions.") from None
    print("AWS default profile: saved", flush=True)


def validate_host_prerequisites():
    """Check local scripts, supported OS, and privilege availability without changing the host."""
    errors = []
    for script in (LOCAL_SETUP,):
        if not script.is_file():
            errors.append(f"Required host preparation script is missing: {script}")
        elif not os.access(script, os.X_OK):
            errors.append(f"Host preparation script is not executable: {script}")

    try:
        # Parse the OS identifier as data; never execute /etc/os-release.
        os_id = ""
        for line in Path("/etc/os-release").read_text().splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip() == "ID":
                words = shlex.split(value, comments=True)
                os_id = words[0] if len(words) == 1 else ""
        if os_id not in ("ubuntu", "debian"):
            errors.append("Unsupported OS; localhost deployment supports only Ubuntu and Debian.")
    except (OSError, ValueError):
        errors.append("Cannot read /etc/os-release; only Ubuntu and Debian hosts are supported.")

    if os.geteuid() != 0 and shutil.which("sudo") is None:
        errors.append("Localhost setup requires root privileges or sudo.")
    if errors:
        raise DeploymentError("\nerror: ".join(errors))
    print("Host prerequisites validation: PASS", flush=True)


def run_command(command, env=None):
    """Run a child process and preserve failure codes without exposing commands or environment."""
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


def prepare_local_host():
    """Run local setup with the required privileges; dependency provisioning is external."""
    if os.geteuid() == 0:
        run_command([str(LOCAL_SETUP)])
    else:
        run_command(["sudo", "-v"])
        run_command(["sudo", str(LOCAL_SETUP)])


def verify_runtime_dependencies():
    """Verify Docker command, daemon access, and Compose availability without starting containers."""
    if shutil.which("docker") is None:
        raise DeploymentError("Docker is not installed or not available in PATH.")
    errors = []
    checks = (
        (["docker", "info"], "Docker is installed but the Docker daemon is not accessible."),
        (["docker", "compose", "version"], "Docker Compose plugin is not available."),
    )
    for command, message in checks:
        try:
            result = subprocess.run(command, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, check=False)
            if result.returncode:
                errors.append(message)
        except OSError:
            errors.append(message)
    if errors:
        raise DeploymentError("\nerror: ".join(errors))
    print("Runtime dependencies verification: PASS", flush=True)


def execute_deployment_pipeline(parameters):
    """Display non-secret context and pass resolved inputs to the Python configuration service."""
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
    if parameters.target == "cloud":
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


def provision_cloud_infrastructure(parameters):
    """Provision through the cloud service (which rolls back on failure), then write the inventory."""
    service = TerraformProvisioningService()
    context = generate_terraform_variables(parameters.terraform_profiles, region=parameters.aws_region)
    try:
        infrastructure = service.provision(context)
    except (RuntimeError, ValueError, OSError, KeyError) as error:
        raise DeploymentError(f"Cloud provisioning failed: {error}") from None
    try:
        inventory = generate_ansible_inventory(
            infrastructure, next(iter(parameters.terraform_profiles.values())),
            context.var_file.parent / "inventory.ini",
        )
    except (ValueError, OSError, KeyError) as error:
        service.rollback_infrastructure(context)
        raise DeploymentError(f"Inventory generation failed: {error}") from None
    print(f"Ansible inventory: {inventory.inventory_file_path}", flush=True)


def display_troubleshooting_hints(failed_step, exit_code):
    """Print the failed stage, original exit code, and a stage-specific remediation hint."""
    hints = {
        "Parse input parameters": "Review --help, option names, and required option values.",
        "Validate input parameters": (
            "Review --help and supported environment/target/use-case values, remote inputs, "
            "and key-file access."
        ),
        "Validate host prerequisites": "Verify the supported OS, script permissions, and sudo availability.",
        "Prepare local host": "Review local.setup.sh output and sudo permissions.",
        "Verify runtime dependencies": "Verify Docker daemon access and Docker Compose availability; dependency installation belongs to Ansible Host Provisioning.",
        "Save AWS profile": "Check write permissions for the AWS shared credentials file.",
        "Provision cloud infrastructure": "Review the Terraform output above, AWS credentials and permissions, and that terraform is installed.",
        "Generate deployment configuration": "Review configuration layers, secret defaults/overrides, and file paths.",
    }
    print(f"Deployment failed at step: {failed_step}", file=sys.stderr)
    print(f"Exit code: {exit_code}", file=sys.stderr)
    print(f"Hint: {hints.get(failed_step, 'Review the preceding error messages.')}", file=sys.stderr)


def run_step(name, function, *args):
    """Execute a named stage and supplement failures with diagnostics; allow normal help exits."""
    try:
        return function(*args)
    except DeploymentError as error:
        print(f"error: {error}", file=sys.stderr)
        display_troubleshooting_hints(name, error.exit_code)
        raise SystemExit(error.exit_code) from None
    except SystemExit as error:
        if error.code:
            display_troubleshooting_hints(name, error.code)
        raise


def main():
    """Validate inputs, prepare localhost only when selected, and generate deployment configuration."""
    parameters = run_step("Parse input parameters", parse_input_parameters)
    run_step("Validate input parameters", validate_input_parameters, parameters)
    if parameters.target == "localhost":
        run_step("Validate host prerequisites", validate_host_prerequisites)
        run_step("Prepare local host", prepare_local_host)
        run_step("Verify runtime dependencies", verify_runtime_dependencies)
    if parameters.target == "cloud":
        run_step("Save AWS profile", save_aws_default_profile, parameters)
        parameters.terraform_profiles = build_terraform_profile(parameters.key_path, parameters.distributed)
    run_step("Generate deployment configuration", execute_deployment_pipeline, parameters)
    if parameters.target == "cloud":
        run_step("Provision cloud infrastructure", provision_cloud_infrastructure, parameters)


if __name__ == "__main__":
    main()
