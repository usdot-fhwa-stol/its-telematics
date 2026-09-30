#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENVIRONMENT=""
TARGET=""
USE_CASE=""

usage() {
    cat <<'EOF'
Usage:
  ./deployment/scripts/deploy.sh --environment <environment> --target <target> --use-case <use-case>

Options:
  --environment   Deployment environment, for example: dev, test, prod
  --target        Deployment target, for example: on-premise, cloud
  --use-case      Deployment use case, for example: core, rsu_integration
  -h, --help      Show this help message
EOF
}

require_value() {
    local option="$1"
    local value="${2:-}"

    if [[ -z "${value}" || "${value}" == --* ]]; then
        echo "error: ${option} requires a value." >&2
        usage >&2
        exit 2
    fi
}

parse_input_parameters() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --environment)
                require_value "$1" "${2:-}"
                ENVIRONMENT="$2"
                shift 2
                ;;
            --target)
                require_value "$1" "${2:-}"
                TARGET="$2"
                shift 2
                ;;
            --use-case)
                require_value "$1" "${2:-}"
                USE_CASE="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo "error: unknown option '$1'." >&2
                usage >&2
                exit 2
                ;;
        esac
    done
}

validate_input_parameters() {
    local failed=false

    if [[ -z "${ENVIRONMENT}" ]]; then
        echo "error: --environment is required." >&2
        failed=true
    elif [[ ! -f "${DEPLOYMENT_DIR}/environment/${ENVIRONMENT}/.env" ]]; then
        echo "error: unknown environment '${ENVIRONMENT}'." >&2
        failed=true
    fi

    if [[ -z "${TARGET}" ]]; then
        echo "error: --target is required." >&2
        failed=true
    elif [[ ! -f "${DEPLOYMENT_DIR}/targets/${TARGET}/.env" ]]; then
        echo "error: unknown target '${TARGET}'." >&2
        failed=true
    fi

    if [[ -z "${USE_CASE}" ]]; then
        echo "error: --use-case is required." >&2
        failed=true
    elif [[ ! -f "${DEPLOYMENT_DIR}/use_cases/${USE_CASE}/.env" ]]; then
        echo "error: unknown use case '${USE_CASE}'." >&2
        failed=true
    fi

    if [[ "${failed}" == true ]]; then
        exit 2
    fi
}

validate_host_prerequisites() {
    local failed=false

    if ! command -v docker >/dev/null 2>&1; then
        echo "error: Docker is not installed or not available in PATH." >&2
        failed=true
    elif ! docker info >/dev/null 2>&1; then
        echo "error: Docker is installed but the Docker daemon is not accessible." >&2
        failed=true
    fi

    if command -v docker >/dev/null 2>&1; then
        if ! docker compose version >/dev/null 2>&1; then
            echo "error: Docker Compose plugin is not available." >&2
            failed=true
        fi
    fi

    if [[ "${TARGET}" == "on-premise" ]]; then
        local setup_script="${DEPLOYMENT_DIR}/../telematic_system/local.setup.sh"

        if [[ ! -f "${setup_script}" ]]; then
            echo "error: required local setup script is missing: ${setup_script}" >&2
            failed=true
        elif [[ ! -x "${setup_script}" ]]; then
            echo "error: local setup script is not executable: ${setup_script}" >&2
            failed=true
        fi
    fi

    if [[ "${failed}" == true ]]; then
        exit 2
    fi

    echo "Host prerequisites validation: PASS"
}

main() {
    parse_input_parameters "$@"
    validate_input_parameters
    validate_host_prerequisites

    echo "Deployment configuration:"
    echo "  environment : ${ENVIRONMENT}"
    echo "  target      : ${TARGET}"
    echo "  use case    : ${USE_CASE}"
    echo

    ENVIRONMENT="${ENVIRONMENT}" \
    TARGET="${TARGET}" \
    USE_CASE="${USE_CASE}" \
    "${SCRIPT_DIR}/configuration_service.sh"
}

main "$@"
