#!/usr/bin/env bash

set -euo pipefail

main() {
    if [[ ! -r /etc/os-release ]]; then
        echo "error: cannot read /etc/os-release; only Ubuntu and Debian hosts are supported." >&2
        exit 2
    fi

    . /etc/os-release

    case "${ID:-}" in
        ubuntu|debian) ;;
        *)
            echo "error: unsupported OS; dependency installation supports only Ubuntu and Debian." >&2
            exit 2
            ;;
    esac

    local packages=()

    if ! command -v docker >/dev/null 2>&1 || ! docker --version >/dev/null 2>&1 \
        || ! command -v dockerd >/dev/null 2>&1 || ! dockerd --version >/dev/null 2>&1; then
        packages+=(docker-ce docker-ce-cli containerd.io)
    fi
    if ! docker compose version >/dev/null 2>&1; then
        packages+=(docker-compose-plugin)
    fi

    if [[ "${#packages[@]}" -eq 0 ]]; then
        echo "Docker Engine and Docker Compose plugin dependencies are already available."
        return
    fi

    local codename="${VERSION_CODENAME:-}"
    if [[ "${ID}" == "ubuntu" ]]; then
        codename="${UBUNTU_CODENAME:-${codename}}"
    fi
    if [[ -z "${codename}" ]]; then
        echo "error: /etc/os-release does not specify a release codename for Docker's apt repository." >&2
        exit 2
    fi
    if ! command -v apt-get >/dev/null 2>&1 || ! command -v dpkg >/dev/null 2>&1; then
        echo "error: dependency installation requires apt-get and dpkg." >&2
        exit 2
    fi

    local privileged_command=()
    if [[ "${EUID}" -ne 0 ]]; then
        if ! command -v sudo >/dev/null 2>&1; then
            echo "error: dependency installation requires root privileges or sudo." >&2
            exit 2
        fi
        sudo -v
        privileged_command=(sudo)
    fi

    local temp_dir
    local architecture
    architecture="$(dpkg --print-architecture)"
    temp_dir="$(mktemp -d)"
    trap "rm -rf -- $(printf '%q' "${temp_dir}")" EXIT

    echo "Installing missing Docker dependencies from Docker's apt repository."
    "${privileged_command[@]}" apt-get update
    "${privileged_command[@]}" apt-get install -y --no-remove --no-upgrade ca-certificates curl
    "${privileged_command[@]}" install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o "${temp_dir}/docker.asc"
    "${privileged_command[@]}" install -m 0644 "${temp_dir}/docker.asc" /etc/apt/keyrings/docker.asc

    cat > "${temp_dir}/docker.sources" <<EOF
Types: deb
URIs: https://download.docker.com/linux/${ID}
Suites: ${codename}
Components: stable
Architectures: ${architecture}
Signed-By: /etc/apt/keyrings/docker.asc
EOF
    "${privileged_command[@]}" install -m 0644 "${temp_dir}/docker.sources" /etc/apt/sources.list.d/docker.sources
    "${privileged_command[@]}" apt-get update
    "${privileged_command[@]}" apt-get install -y --no-remove --no-upgrade "${packages[@]}"

    if ! docker --version >/dev/null 2>&1 || ! dockerd --version >/dev/null 2>&1 \
        || ! docker compose version >/dev/null 2>&1; then
        echo "error: Docker Engine or Docker Compose plugin is still unavailable after installation." >&2
        exit 2
    fi

    echo "Docker Engine and Docker Compose plugin dependencies are available."
}

main "$@"
