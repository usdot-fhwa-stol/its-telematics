#!/usr/bin/env python3
"""Build layered runtime configuration and deployment metadata."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from models import DeploymentProfile, TerraformContext

from models import (
    ENVIRONMENT_PROD,
    ENVIRONMENTS,
    DEPLOYMENT_DIR,
    ROLE_ALL,
    ROLE_UI,
    SYSTEM_DIR,
    SYSTEM_RELATIVE_DIR,
    TARGET_CLOUD,
    TARGET_LOCALHOST,
    TARGET_REMOTE,
    TERRAFORM_DIR,
    TARGETS,
    USE_CASE_ALL,
    USE_CASE_CORE,
    USE_CASE_RSU_INTEGRATION,
    USE_CASES,
    DeploymentProfile,
    TerraformContext,
)


DEFAULT_AWS_REGION = "us-east-1"
PUBLIC_WEB_ROLES = {ROLE_UI, ROLE_ALL}
SECRET_KEYS = (
    "mysql_password",
    "mysql_root_password",
    "grafana_secret_key",
    "influx_admin_token",
)


def load_terraform_profiles(serialized):
    """Rebuild the role -> DeploymentProfile mapping serialized by setup.py.

    Args:
        serialized: JSON text of the TERRAFORM_PROFILES environment variable.

    Returns:
        Dict mapping each role to its DeploymentProfile.

    Raises:
        ValueError: If the text is not a valid role-to-profile mapping.
    """
    try:
        raw = json.loads(serialized)
        return {
            role: DeploymentProfile(**{**fields, "path_to_ssh_token": Path(fields["path_to_ssh_token"])})
            for role, fields in raw.items()
        }
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ValueError("TERRAFORM_PROFILES is not a valid role-to-profile mapping.") from None


def resolve_public_key(key_path, work_dir):
    """Return a public key file for the key pair, deriving it when given a private key (e.g. a .pem).

    Args:
        key_path: Path to a public or unencrypted private key.
        work_dir: Directory where a derived public key is written.

    Returns:
        Path to the public key file.

    Raises:
        ValueError: If the key is unreadable, ssh-keygen is missing, or derivation fails.
    """
    key_path = Path(key_path)
    try:
        first_line = key_path.read_text(errors="ignore").lstrip().split("\n", 1)[0]
    except OSError:
        raise ValueError("Cannot read the SSH key file.") from None
    if first_line.startswith(("ssh-", "ecdsa-", "sk-")):
        return key_path
    # ssh-keygen rejects a key file that is group/world-readable and owned by the caller (as root under
    # sudo), and the file may sit on a share that cannot be chmod-ed, so derive from a private copy.
    try:
        private_copy = tempfile.NamedTemporaryFile(prefix="ssh_key_", delete=False)
    except OSError:
        raise ValueError("Cannot create a temporary file to derive the public key.") from None
    try:
        with private_copy:
            os.chmod(private_copy.name, 0o600)
            private_copy.write(key_path.read_bytes())
        result = subprocess.run(
            ["ssh-keygen", "-y", "-f", private_copy.name],
            capture_output=True, text=True, stdin=subprocess.DEVNULL, check=False,
        )
    except FileNotFoundError:
        raise ValueError("ssh-keygen is required to derive a public key from a private key.") from None
    except OSError:
        raise ValueError("Cannot read the SSH key file.") from None
    finally:
        try:
            os.unlink(private_copy.name)
        except OSError:
            pass
    if result.returncode != 0 or not result.stdout.startswith(("ssh-", "ecdsa-", "sk-")):
        raise ValueError("Could not derive a public key; use an unencrypted private key or a .pub file.")
    work_dir.mkdir(parents=True, exist_ok=True)
    public_key = work_dir / "ssh_public_key.pub"
    write_atomic(public_key, result.stdout.encode("utf-8"), mode=0o644)
    return public_key


def generate_terraform_variables(
    profiles, region=DEFAULT_AWS_REGION, aws_profile="default",
    root_path=TERRAFORM_DIR, work_dir=DEPLOYMENT_DIR / "targets" / "cloud",
):
    """Write the Terraform variable file from the setup.py profiles and return the TerraformContext.

    Args:
        profiles: Role -> DeploymentProfile mapping; the first profile's key supplies the public key.
        region: AWS region.
        aws_profile: AWS CLI profile name.
        root_path: Terraform module directory.
        work_dir: Directory for the var file, plan file, and derived public key.

    Returns:
        TerraformContext pointing at the written var file and the planned plan file.

    Raises:
        ValueError: If the public key cannot be resolved or the var file cannot be written.
    """
    context = TerraformContext(
        root_path=root_path,
        config_reference=profiles,
        var_file=work_dir / "terraform.tfvars.json",
        plan_file=work_dir / "infrastructure.tfplan",
    )
    variables = {
        "region": region,
        "aws_profile": aws_profile,
        "public_key_path": str(resolve_public_key(next(iter(profiles.values())).path_to_ssh_token, work_dir)),
        "nodes": {
            role: {
                "instance_type": p.instance_type,
                "instance_count": p.instance_count,
                "ami_id": p.ami_id,
                "subnet_id": p.subnet_id,
                "root_volume_size_gib": p.root_volume_size_gib,
                "volume_type": p.volume_type,
                "public_web": role in PUBLIC_WEB_ROLES,
            }
            for role, p in profiles.items()
        },
    }
    work_dir.mkdir(parents=True, exist_ok=True)
    write_atomic(context.var_file, json.dumps(variables, indent=2).encode("utf-8"))
    return context


def validate_configuration():
    """Read environment inputs, apply defaults, and validate selections and connection metadata.

    Returns:
        Dict of lower-cased parameter names (environment, target, use_case, remote_io,
        remote_user, key_path, and the secret overrides) to their values.

    Raises:
        ValueError: If a selection is invalid, remote connection details are missing,
            or KEY_PATH is not a readable file.
    """
    parameters = {
        name.lower(): os.environ.get(name, "")
        for name in (
            "ENVIRONMENT", "TARGET", "USE_CASE", "REMOTE_IO", "REMOTE_USER", "KEY_PATH",
            "MYSQL_PASSWORD_OVERRIDE", "MYSQL_ROOT_PASSWORD_OVERRIDE",
            "GRAFANA_SECRET_KEY_OVERRIDE", "INFLUX_ADMIN_TOKEN_OVERRIDE",
        )
    }
    if not parameters["environment"]:
        parameters["environment"] = ENVIRONMENT_PROD
        print(f"No environment specified. Defaulting to '{ENVIRONMENT_PROD}'.", flush=True)
    if not parameters["target"]:
        parameters["target"] = TARGET_LOCALHOST
        print(f"No target specified. Defaulting to '{TARGET_LOCALHOST}'.", flush=True)

    if parameters["environment"] not in ENVIRONMENTS:
        raise ValueError(f"ENVIRONMENT must be one of: {', '.join(ENVIRONMENTS)}.")
    if parameters["target"] not in TARGETS:
        raise ValueError(f"TARGET must be one of: {', '.join(TARGETS)}.")
    parameters["use_case"] = parameters["use_case"] or USE_CASE_ALL
    if parameters["use_case"] not in USE_CASES:
        raise ValueError(f"USE_CASE must be one of: {', '.join(USE_CASES)}.")
    if parameters["target"] == TARGET_REMOTE:
        if not parameters["remote_io"]:
            raise ValueError("REMOTE_IO is required for target remote.")
        if not parameters["remote_user"]:
            raise ValueError("REMOTE_USER is required for target remote.")
    if parameters["key_path"]:
        key_path = Path(parameters["key_path"])
        if not key_path.is_file() or not os.access(key_path, os.R_OK):
            raise ValueError("KEY_PATH must refer to an existing readable file.")
    return parameters


def load_layered_profiles(parameters):
    """Merge base, environment, target, and use-case layers; later assignments take precedence.

    Args:
        parameters: Validated parameters from validate_configuration.

    Returns:
        Dict of configuration keys to raw values, with quotes and comments preserved.

    Raises:
        ValueError: If a layer is missing, not valid UTF-8, or has a malformed line.
    """
    # Localhost and remote share the on-premise profile; cloud uses the cloud profile.
    target_profile_by_target = {
        TARGET_LOCALHOST: "on-premise",
        TARGET_REMOTE: "on-premise",
        TARGET_CLOUD: "cloud",
    }
    target_profile = target_profile_by_target[parameters["target"]]
    use_case_layers = {
        USE_CASE_CORE: (USE_CASE_CORE,),
        USE_CASE_RSU_INTEGRATION: (USE_CASE_RSU_INTEGRATION,),
        USE_CASE_ALL: (USE_CASE_CORE, USE_CASE_RSU_INTEGRATION),
    }
    layers = [
        SYSTEM_DIR / "sample.env",
        DEPLOYMENT_DIR / "environment" / parameters["environment"] / ".env",
        DEPLOYMENT_DIR / "targets" / target_profile / ".env",
    ]
    layers.extend(
        DEPLOYMENT_DIR / "use_cases" / name / ".env"
        for name in use_case_layers[parameters["use_case"]]
    )

    for layer in layers:
        if not layer.is_file():
            raise ValueError(f"Missing configuration file: {layer}")

    config_map = {}
    for layer in layers:
        try:
            contents = layer.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            raise ValueError(f"Cannot read configuration file as UTF-8: {layer}") from None
        for line_number, line in enumerate(contents.split("\n"), start=1):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            key, separator, value = line.partition("=")
            key = key.strip()
            if not separator or not key:
                # Report location only; the original line may contain a secret.
                raise ValueError(f"Expected KEY=VALUE in {layer} at line {line_number}.")
            config_map.pop(key, None)
            config_map[key] = value

    if parameters["use_case"] == USE_CASE_ALL:
        config_map["COMPOSE_PROFILES"] = "messaging,rsu_integration"
    return config_map


def apply_parameter_overrides(parameters):
    """Return non-secret connection metadata without adding it to container configuration.

    Args:
        parameters: Validated parameters from validate_configuration.

    Returns:
        Dict with environment, target, use_case, remote_io, remote_user, and key_path.
    """
    # Connection inputs belong to deployment automation, not the container .env.
    return {
        "environment": parameters["environment"],
        "target": parameters["target"],
        "use_case": parameters["use_case"],
        "remote_io": parameters["remote_io"],
        "remote_user": parameters["remote_user"],
        "key_path": parameters["key_path"],
    }


def write_atomic(path, contents, mode=0o600):
    """Replace an artifact atomically with the requested permissions and clean up its temporary file.

    Args:
        path: Destination file.
        contents: Bytes to write.
        mode: File permission bits applied before the content is written.

    Raises:
        ValueError: If the file cannot be written.
    """
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=path.parent, prefix=f"{path.name}.tmp.", delete=False
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            os.fchmod(temporary_file.fileno(), mode)
            temporary_file.write(contents)
        os.replace(temporary_path, path)
    except OSError:
        raise ValueError(f"Cannot write {path}; check directory permissions and available space.") from None
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def rotate_secret_artifacts(config_map, parameters):
    """Resolve all secret sources, refresh protected artifacts, and return the synchronized ConfigMap.

    Every source is read before any secret file is written, so a failure leaves existing files intact.

    Args:
        config_map: Configuration values; MYSQL_PASSWORD is updated in place.
        parameters: Validated parameters holding the <secret>_override values.

    Returns:
        The updated config_map.

    Raises:
        ValueError: If a secret has no override and no non-empty example file.
    """
    secrets_dir = SYSTEM_DIR / "secrets"
    prepared_secrets = {}
    errors = []

    # Resolve and read every source before creating or replacing any secret file.
    for secret in SECRET_KEYS:
        override = parameters[f"{secret}_override"]
        example = secrets_dir / f"{secret}.txt.example"
        if override:
            prepared_secrets[secret] = (override.encode("utf-8"), "supplied override")
            continue
        try:
            contents = example.read_bytes()
        except OSError:
            contents = b""
        if contents:
            prepared_secrets[secret] = (contents, "example default")
        else:
            errors.append(
                f"Could not configure {secret}: provide a non-empty readable example file "
                f"{example} or supply --secret-override {secret}=<value>."
            )

    if errors:
        raise ValueError("\nerror: ".join(errors))

    mysql_password = prepared_secrets["mysql_password"][0].decode("utf-8").rstrip("\r\n")

    secrets_dir.mkdir(parents=True, exist_ok=True)
    for secret, (contents, source) in prepared_secrets.items():
        write_atomic(secrets_dir / f"{secret}.txt", contents, mode=0o644)
        print(f"Configured {secret} from {source}.", flush=True)

    config_map["MYSQL_PASSWORD"] = mysql_password
    return config_map


def quote_env_literal(value):
    """Quote a Compose .env literal without interpolation or whitespace loss.

    Args:
        value: Raw string value.

    Returns:
        JSON-quoted string with "$" escaped as "$$".
    """
    return json.dumps(value, ensure_ascii=False).replace("$", "$$")


def generate_consolidated_runtime_manifest(config_map, deployment_context):
    """Write the runtime .env and emit deployment context and in-memory manifest metadata.

    Args:
        config_map: Configuration values to write.
        deployment_context: Non-secret connection metadata printed as JSON.

    Returns:
        Manifest reference with runtime_env_path and compose_manifest_paths, relative to the repository root.

    Raises:
        ValueError: If the runtime file cannot be written.
    """
    runtime_env = SYSTEM_DIR / ".env"
    contents = "# Generated by deployment/scripts/configuration_service.py\n"
    contents += "".join(
        f"{key}={quote_env_literal(value) if key == 'MYSQL_PASSWORD' else value}\n"
        for key, value in config_map.items()
    )
    write_atomic(runtime_env, contents.encode("utf-8"))
    print(f"Generated runtime configuration: {runtime_env}", flush=True)

    manifest_reference = {
        "runtime_env_path": str(SYSTEM_RELATIVE_DIR / ".env"),
        "compose_manifest_paths": [str(SYSTEM_RELATIVE_DIR / "docker-compose.yml")],
    }
    print(json.dumps(deployment_context))
    print(json.dumps(manifest_reference))
    return manifest_reference


def main():
    """Generate deployment artifacts in design order and report failures without secret values.

    Returns:
        Process exit code: 0 on success, 2 on a configuration or filesystem error.
    """
    try:
        parameters = validate_configuration()
        config_map = load_layered_profiles(parameters)
        config_map = rotate_secret_artifacts(config_map, parameters)
        deployment_context = apply_parameter_overrides(parameters)
        generate_consolidated_runtime_manifest(config_map, deployment_context)
        if parameters["target"] == TARGET_CLOUD:
            profiles = load_terraform_profiles(os.environ.get("TERRAFORM_PROFILES", ""))
            context = generate_terraform_variables(
                profiles, region=os.environ.get("AWS_REGION") or DEFAULT_AWS_REGION)
            print(f"Generated Terraform variables: {context.var_file}", flush=True)
    except OSError:
        print("error: filesystem operation failed; check configuration paths and permissions.", file=sys.stderr)
        return 2
    except UnicodeError:
        # Encoding exceptions may contain input data; never print their contents.
        print("error: invalid text encoding in configuration inputs.", file=sys.stderr)
        return 2
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
