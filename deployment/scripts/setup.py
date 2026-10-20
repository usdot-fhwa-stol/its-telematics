#!/usr/bin/env python3
"""Run the ITS Telematics deployment workflow."""

import argparse
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys


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
    if parameters.key_path:
        key_path = Path(parameters.key_path)
        if not key_path.is_file() or not os.access(key_path, os.R_OK):
            errors.append("--key-path must refer to an existing readable file.")
    if errors:
        raise DeploymentError("\nerror: ".join(errors))


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
    })
    for key in SECRET_KEYS:
        environment[f"{key.upper()}_OVERRIDE"] = parameters.secret_overrides.get(key, "")
    run_command(
        [sys.executable, str(CONFIGURATION_SERVICE)],
        env=environment,
    )


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
    run_step("Generate deployment configuration", execute_deployment_pipeline, parameters)


if __name__ == "__main__":
    main()
