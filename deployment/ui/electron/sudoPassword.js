'use strict';

// The administrator password for a localhost run. The app runs deploy.py with
// no terminal, so sudo caches a password per parent process and the Ansible
// playbook's `become` cannot reuse the `sudo -v` that deploy.py runs. Instead
// the user enters the password once, the app checks it with sudo, and
// askpass.py hands it to every sudo (SUDO_ASKPASS) and to Ansible
// (ANSIBLE_BECOME_PASSWORD_FILE) until the run ends.
//
// The password is kept in memory only. It never goes on a command line, into
// the environment or into a file: askpass.py reads it from a Unix socket in a
// directory only this user can open.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ASKPASS = path.join(__dirname, 'askpass.py');
const SOCKET_ENV = 'TELEMATICS_ASKPASS_SOCKET';
const CHECK_TIMEOUT_MS = 15_000;
const MAX_PASSWORD_LENGTH = 1024;

function runSudo(args, { sudo = 'sudo', input = null } = {}) {
  return new Promise((resolve) => {
    let stderr = '';
    const child = spawn(sudo, args, { stdio: [input === null ? 'ignore' : 'pipe', 'ignore', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), CHECK_TIMEOUT_MS);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    if (input !== null) {
      child.stdin.on('error', () => {}); // sudo exited without reading.
      child.stdin.end(input);
    }
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ code: null, stderr: `${sudo} was not found.` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
  });
}

// Whether sudo asks this user for a password. -k ignores cached credentials,
// so the answer does not depend on an earlier sudo.
async function passwordNeeded(options) {
  return (await runSudo(['-n', '-k', 'true'], options)).code !== 0;
}

// Resolves to null if sudo accepts the password, or to a message without the
// password otherwise.
async function checkPassword(password, options) {
  if (typeof password !== 'string' || !password) return 'Enter your administrator password.';
  if (password.length > MAX_PASSWORD_LENGTH || /[\r\n\u0000]/.test(password)) {
    return 'sudo did not accept that password.';
  }
  // -S reads the password from standard input; -p '' prints no prompt.
  const { code, stderr } = await runSudo(['-k', '-S', '-p', '', 'true'], { ...options, input: `${password}\n` });
  if (code === 0) return null;
  if (/not in the sudoers|not allowed/i.test(stderr)) return 'Your account is not allowed to use sudo on this machine.';
  if (code === null) return stderr.trim() || 'sudo did not answer.';
  return 'sudo did not accept that password.';
}

// Serves the password to askpass.py until close(). `env` holds the variables
// that make sudo and Ansible run askpass.py.
function startPasswordServer(password) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telematics-askpass-'));
  fs.chmodSync(dir, 0o700);
  const socketPath = path.join(dir, 'socket');
  const server = net.createServer((socket) => {
    socket.on('error', () => {});
    socket.end(password);
  });
  const listening = new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  const close = () => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  };
  return {
    listening,
    env: { [SOCKET_ENV]: socketPath, SUDO_ASKPASS: ASKPASS, ANSIBLE_BECOME_PASSWORD_FILE: ASKPASS },
    close,
  };
}

module.exports = { ASKPASS, SOCKET_ENV, passwordNeeded, checkPassword, startPasswordServer };
