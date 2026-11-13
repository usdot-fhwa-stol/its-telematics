'use strict';

// The administrator password for a localhost run, or for a cloud run that must
// install Terraform or Ansible first. The app runs deploy.py with no terminal,
// so sudo caches a password per parent process and the Ansible playbook's
// `become` cannot reuse the `sudo -v` that deploy.py runs. Instead the user
// enters the password once, the app checks it with sudo, and askpass.py hands
// it to every sudo in the run until it ends: a sudo wrapper on PATH adds -A
// (SUDO_ASKPASS), and on localhost ANSIBLE_BECOME_FLAGS makes the playbook's
// become use -A too.
//
// The password is kept in memory only. It never goes on a command line, into
// the environment or into a file: askpass.py reads it from a Unix socket in a
// directory only this user can open.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

// sudo and Ansible execute this file, so a packaged app ships it outside its
// asar archive (asarUnpack in package.json), in app.asar.unpacked.
const ASKPASS = path.join(__dirname, 'askpass.py').replace(
  `${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`,
);
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

// What deploy.py installs with apt before a cloud run, because it is not on
// PATH (deploy.py's validate_host_prerequisites). Empty when nothing is missing.
function cloudInstalls(pathValue = process.env.PATH) {
  const installs = [];
  if (!findExecutable('ansible', pathValue) || !findExecutable('ansible-playbook', pathValue)) installs.push('Ansible');
  if (!findExecutable('terraform', pathValue)) installs.push('Terraform');
  return installs;
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

// The first executable `name` on a PATH string, or null.
function findExecutable(name, pathValue = '') {
  for (const dir of pathValue.split(path.delimiter)) {
    if (!path.isAbsolute(dir)) continue;
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Not here; keep looking.
    }
  }
  return null;
}

const shellQuote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;

function sudoWrapperScript(realSudo) {
  return [
    '#!/bin/sh',
    '# Written by Telematics Deploy for one localhost run (see sudoPassword.js).',
    `real=${shellQuote(realSudo)}`,
    'skip=',
    'for arg do',
    '  if [ -n "$skip" ]; then skip=; continue; fi',
    '  case $arg in',
    '    --) break ;;',
    '    -A|-S|--askpass|--stdin) exec "$real" "$@" ;;',
    '    -C|-D|-g|-p|-R|-r|-t|-T|-U|-u|--chdir|--group|--prompt|--other-user|--user) skip=1 ;;',
    '    --*) ;;',
    '    -*[AS]*) exec "$real" "$@" ;;',
    '    -*) ;;',
    '    *) break ;;',
    '  esac',
    'done',
    'exec "$real" -A "$@"',
    '',
  ].join('\n');
}


const ANSIBLE_BECOME_FLAGS = '-H -A';

// Serves the password to askpass.py until close(). `env` holds the variables
// that make every sudo and Ansible run askpass.py.
function startPasswordServer(password, { baseEnv = process.env, ansibleBecome = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'telematics-askpass-'));
  fs.chmodSync(dir, 0o700);
  const socketPath = path.join(dir, 'socket');
  const env = { [SOCKET_ENV]: socketPath, SUDO_ASKPASS: ASKPASS, ...(ansibleBecome ? { ANSIBLE_BECOME_FLAGS } : {}) };
  const realSudo = findExecutable('sudo', baseEnv.PATH);
  if (realSudo) {
    const binDir = path.join(dir, 'bin');
    fs.mkdirSync(binDir, { mode: 0o700 });
    fs.writeFileSync(path.join(binDir, 'sudo'), sudoWrapperScript(realSudo), { mode: 0o700 });
    env.PATH = [binDir, baseEnv.PATH].filter(Boolean).join(path.delimiter);
  }
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
  return { listening, env, close };
}

module.exports = {
  ASKPASS, SOCKET_ENV, passwordNeeded, checkPassword, startPasswordServer, findExecutable, cloudInstalls,
};
