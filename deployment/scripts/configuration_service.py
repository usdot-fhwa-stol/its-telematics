#!/usr/bin/env python3
"""Build layered runtime configuration and deployment metadata."""

import json
import os
from pathlib import Path
import sys
import tempfile


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEPLOYMENT_DIR = REPO_ROOT / "deployment"
SYSTEM_DIR = REPO_ROOT / "telematic_system"
SECRET_KEYS = (
    "mysql_password",
    "mysql_root_password",
    "grafana_secret_key",
    "influx_admin_token",
)


def validate_configuration():
    """Read environment inputs, apply defaults, and validate selections and connection metadata."""
    parameters = {
        name.lower(): os.environ.get(name, "")
        for name in (
            "ENVIRONMENT", "TARGET", "USE_CASE", "REMOTE_IO", "REMOTE_USER", "KEY_PATH",
            "MYSQL_PASSWORD_OVERRIDE", "MYSQL_ROOT_PASSWORD_OVERRIDE",
            "GRAFANA_SECRET_KEY_OVERRIDE", "INFLUX_ADMIN_TOKEN_OVERRIDE",
        )
    }
    if not parameters["environment"]:
        parameters["environment"] = "prod"
        print("No environment specified. Defaulting to 'prod'.", flush=True)
    if not parameters["target"]:
        parameters["target"] = "localhost"
        print("No target specified. Defaulting to 'localhost'.", flush=True)

    if parameters["environment"] not in ("dev", "test", "prod"):
        raise ValueError("ENVIRONMENT must be one of: dev, test, prod.")
    if parameters["target"] not in ("localhost", "remote", "cloud"):
        raise ValueError("TARGET must be one of: localhost, remote, cloud.")
    parameters["use_case"] = parameters["use_case"] or "all"
    if parameters["use_case"] not in ("all", "core", "rsu_integration"):
        raise ValueError("USE_CASE must be one of: all, core, rsu_integration.")
    if parameters["target"] == "remote":
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
    """Merge base, environment, target, and use-case layers; later assignments take precedence."""
    # Localhost and remote share the on-premise profile; cloud uses the cloud profile.
    target_profile_by_target = {
        "localhost": "on-premise",
        "remote": "on-premise",
        "cloud": "cloud",
    }
    target_profile = target_profile_by_target[parameters["target"]]
    use_case_layers = {
        "core": ("core",),
        "rsu_integration": ("rsu_integration",),
        "all": ("core", "rsu_integration"),
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
            # Preserve quotes, inline comments, and expressions without evaluation.
            config_map[key] = value

    if parameters["use_case"] == "all":
        config_map["COMPOSE_PROFILES"] = "messaging,rsu_integration"
    return config_map


def apply_parameter_overrides(parameters):
    """Return non-secret connection metadata without adding it to container configuration."""
    # Connection inputs belong to deployment automation, not the container .env.
    return {
        "environment": parameters["environment"],
        "target": parameters["target"],
        "use_case": parameters["use_case"],
        "remote_io": parameters["remote_io"],
        "remote_user": parameters["remote_user"],
        "key_path": parameters["key_path"],
    }


def write_atomic(path, contents):
    """Replace an artifact atomically with mode 600 and clean up its temporary file."""
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=path.parent, prefix=f"{path.name}.tmp.", delete=False
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            os.fchmod(temporary_file.fileno(), 0o600)
            temporary_file.write(contents)
        os.replace(temporary_path, path)
    except OSError:
        raise ValueError(f"Cannot write {path}; check directory permissions and available space.") from None
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def rotate_secret_artifacts(config_map, parameters):
    """Resolve all secret sources, refresh protected artifacts, and return the synchronized ConfigMap."""
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
        write_atomic(secrets_dir / f"{secret}.txt", contents)
        print(f"Configured {secret} from {source}.", flush=True)

    config_map["MYSQL_PASSWORD"] = mysql_password
    return config_map


def quote_env_literal(value):
    """Quote a Compose .env literal without interpolation or whitespace loss."""
    return json.dumps(value, ensure_ascii=False).replace("$", "$$")


def generate_consolidated_runtime_manifest(config_map, deployment_context):
    """Write the runtime .env and emit deployment context and in-memory manifest metadata."""
    runtime_env = SYSTEM_DIR / ".env"
    contents = "# Generated by deployment/scripts/configuration_service.py\n"
    contents += "".join(
        f"{key}={quote_env_literal(value) if key == 'MYSQL_PASSWORD' else value}\n"
        for key, value in config_map.items()
    )
    write_atomic(runtime_env, contents.encode("utf-8"))
    print(f"Generated runtime configuration: {runtime_env}", flush=True)

    manifest_reference = {
        "runtime_env_path": "telematic_system/.env",
        "compose_manifest_paths": ["telematic_system/docker-compose.yml"],
    }
    print(json.dumps(deployment_context))
    print(json.dumps(manifest_reference))
    return manifest_reference


def main():
    """Generate deployment artifacts in design order and report failures without secret values."""
    try:
        parameters = validate_configuration()
        config_map = load_layered_profiles(parameters)
        config_map = rotate_secret_artifacts(config_map, parameters)
        deployment_context = apply_parameter_overrides(parameters)
        generate_consolidated_runtime_manifest(config_map, deployment_context)
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
