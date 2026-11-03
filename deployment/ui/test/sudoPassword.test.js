'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { ASKPASS, SOCKET_ENV, passwordNeeded, checkPassword, startPasswordServer } = require('../electron/sudoPassword');

// A stand-in sudo: `-n` fails unless NOPASSWD is set; with -S it accepts only "right pw".
function fakeSudo({ nopasswd = false, notAllowed = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-sudo-'));
  const sudo = path.join(dir, 'sudo');
  fs.writeFileSync(sudo, [
    '#!/bin/sh',
    `echo "$*" > "${dir}/args"`,
    notAllowed ? 'echo "user is not in the sudoers file." >&2; exit 1' : '',
    `case "$*" in *-n*) ${nopasswd ? 'exit 0' : 'echo "sudo: a password is required" >&2; exit 1'};; esac`,
    'read -r password',
    '[ "$password" = "right pw" ] || { echo "Sorry, try again." >&2; exit 1; }',
  ].join('\n'), { mode: 0o755 });
  return { sudo, args: () => fs.readFileSync(path.join(dir, 'args'), 'utf8').trim() };
}

const askpass = (env) => new Promise((resolve) => {
  execFile(ASKPASS, [], { env: { PATH: process.env.PATH, ...env } }, (error, stdout, stderr) => {
    resolve({ code: error ? error.code : 0, stdout, stderr });
  });
});

test('asks for a password only when sudo needs one', async () => {
  const strict = fakeSudo();
  assert.equal(await passwordNeeded({ sudo: strict.sudo }), true);
  assert.equal(strict.args(), '-n -k true');
  assert.equal(await passwordNeeded({ sudo: fakeSudo({ nopasswd: true }).sudo }), false);
});

test('checks the password with sudo, without echoing it', async () => {
  const fake = fakeSudo();
  assert.equal(await checkPassword('right pw', { sudo: fake.sudo }), null);
  assert.equal(fake.args(), '-k -S -p  true');
  const wrong = await checkPassword('hunter2', { sudo: fake.sudo });
  assert.equal(wrong, 'sudo did not accept that password.');
  assert.equal(await checkPassword('', { sudo: fake.sudo }), 'Enter your administrator password.');
  assert.equal(await checkPassword('two\nlines', { sudo: fake.sudo }), 'sudo did not accept that password.');
  assert.match(await checkPassword('right pw', { sudo: fakeSudo({ notAllowed: true }).sudo }), /not allowed to use sudo/);
  assert.match(await checkPassword('x', { sudo: '/no/such/sudo' }), /was not found/);
});

test('askpass.py prints the password the app serves, then stops working', async () => {
  const server = startPasswordServer('p@ss "word"');
  await server.listening;
  const socketDir = path.dirname(server.env[SOCKET_ENV]);
  assert.equal(fs.statSync(socketDir).mode & 0o777, 0o700);
  assert.equal(server.env.SUDO_ASKPASS, ASKPASS);
  assert.equal(server.env.ANSIBLE_BECOME_PASSWORD_FILE, ASKPASS);
  assert.equal(Object.values(server.env).some((value) => value.includes('p@ss')), false);

  // sudo runs it with a prompt argument; Ansible runs it with none. Both get the password.
  for (let i = 0; i < 2; i += 1) {
    const { code, stdout } = await askpass(server.env);
    assert.equal(code, 0);
    assert.equal(stdout, 'p@ss "word"\n');
  }

  server.close();
  assert.equal(fs.existsSync(socketDir), false);
  const after = await askpass(server.env);
  assert.equal(after.code, 1);
  assert.equal(after.stdout, '');
  assert.equal((await askpass({})).code, 1);
});
