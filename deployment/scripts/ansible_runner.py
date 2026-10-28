#!/usr/bin/env python3
"""Thin wrapper that runs Ansible ad-hoc commands and playbooks without a shell."""

import json
import os
import subprocess
from pathlib import Path
from typing import Dict, Optional

from models import CommandResult

ALL_HOSTS = "all"  # Ansible host pattern matching every inventory host


def _run(command, step: str, env_overrides: Optional[Dict[str, str]] = None,
         timeout: Optional[int] = None) -> CommandResult:
    """Execute an Ansible command line without a shell and capture its outcome.

    Args:
        command: Argument list to execute.
        step: Pipeline step name recorded in the result.
        env_overrides: Extra environment variables layered over the current environment.
        timeout: Maximum runtime in seconds, or None for no limit.

    Returns:
        CommandResult with exit code 127 if Ansible is missing, 124 on timeout, 126 if it
        cannot be executed, otherwise the process exit code, stdout and stderr.
    """
    env = {**os.environ, "ANSIBLE_NOCOLOR": "1", "ANSIBLE_FORCE_COLOR": "0",
           "ANSIBLE_INTERPRETER_PYTHON": "auto_silent", **(env_overrides or {})}
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False, env=env, timeout=timeout)
    except FileNotFoundError:
        return CommandResult(step, False, 127, "", "Ansible is not installed or not in PATH.")
    except subprocess.TimeoutExpired:
        return CommandResult(step, False, 124, "", f"Timed out after {timeout} seconds.")
    except OSError as error:
        return CommandResult(step, False, 126, "", f"Could not execute Ansible: {error}")
    return CommandResult(step, result.returncode == 0, result.returncode, result.stdout, result.stderr)


def run_ad_hoc(
    inventory: Path, pattern: str, module: str, module_args, step: str,
    become: bool = False, json_output: bool = False, timeout: Optional[int] = None,
) -> CommandResult:
    """Run one Ansible module on the hosts matching a pattern.

    Args:
        inventory: Path to the inventory file.
        pattern: Ansible host pattern, for example ALL_HOSTS or a group name.
        module: Fully qualified module name.
        module_args: Module arguments as a string or a dict (serialized to JSON); may be empty.
        step: Pipeline step name recorded in the result.
        become: Escalate privileges with --become.
        json_output: Use the JSON stdout callback so the output can be parsed.
        timeout: Maximum runtime in seconds, or None for no limit.

    Returns:
        CommandResult of the ansible invocation.
    """
    command = ["ansible", pattern, "-i", str(inventory), "-m", module]
    if module_args:
        command += ["-a", module_args if isinstance(module_args, str) else json.dumps(module_args)]
    if become:
        command.append("--become")
    env = {"ANSIBLE_LOAD_CALLBACK_PLUGINS": "1", "ANSIBLE_STDOUT_CALLBACK": "json"} if json_output else None
    return _run(command, step, env, timeout)


def run_shell(inventory: Path, pattern: str, command_line: str, step: str,
              timeout: Optional[int] = None) -> CommandResult:
    """Run a shell command line in the login user's home directory on every matching host.

    Args:
        inventory: Path to the inventory file.
        pattern: Ansible host pattern.
        command_line: Command executed through ansible.builtin.shell.
        step: Pipeline step name recorded in the result.
        timeout: Maximum runtime in seconds, or None for no limit.

    Returns:
        CommandResult of the ansible invocation.
    """
    return run_ad_hoc(inventory, pattern, "ansible.builtin.shell", {"cmd": command_line}, step, timeout=timeout)


def run_playbook(inventory: Path, playbook: Path, step: str, extra_vars: Optional[Dict[str, str]] = None,
                 timeout: Optional[int] = None) -> CommandResult:
    """Run an Ansible playbook against an inventory.

    Args:
        inventory: Path to the inventory file.
        playbook: Path to the playbook YAML file.
        step: Pipeline step name recorded in the result.
        extra_vars: Variables passed to the playbook as JSON extra-vars.
        timeout: Maximum runtime in seconds, or None for no limit.

    Returns:
        CommandResult of the ansible-playbook invocation.
    """
    command = ["ansible-playbook", "-i", str(inventory), str(playbook)]
    if extra_vars:
        command += ["--extra-vars", json.dumps(extra_vars)]
    return _run(command, step, None, timeout)
