#!/usr/bin/env python3
"""Print the administrator password the app holds for the current localhost run.

sudo runs this helper as SUDO_ASKPASS when it needs a password and has no
terminal, and Ansible runs it as ANSIBLE_BECOME_PASSWORD_FILE. The password
comes from the app over the Unix socket named in TELEMATICS_ASKPASS_SOCKET
(see sudoPassword.js) and goes to the caller on stdout only.
"""

import os
import socket
import sys


def main():
    path = os.environ.get("TELEMATICS_ASKPASS_SOCKET")
    if not path:
        print("No password is available: start the run from the Telematics Deploy app.", file=sys.stderr)
        return 1
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
            connection.connect(path)
            chunks = []
            while True:
                chunk = connection.recv(4096)
                if not chunk:
                    break
                chunks.append(chunk)
    except OSError:
        print("The app is no longer serving the password for this run.", file=sys.stderr)
        return 1
    sys.stdout.buffer.write(b"".join(chunks) + b"\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
