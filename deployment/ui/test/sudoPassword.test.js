'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  ASKPASS, SOCKET_ENV, passwordNeeded, checkPassword, startPasswordServer, cloudInstalls,
} = require('../electron/sudoPassword');

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
  // Ansible gets no password; its become runs `sudo -H -A` and uses askpass.py too.
  assert.equal(server.env.ANSIBLE_BECOME_FLAGS, '-H -A');
  assert.equal('ANSIBLE_BECOME_PASSWORD_FILE' in server.env, false);
  assert.equal(Object.values(server.env).some((value) => value.includes('p@ss')), false);

  // Each sudo in the run asks again; every call gets the password.
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

// A stand-in sudo that only records its arguments, one per line.
function recordingSudo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-realsudo-'));
  fs.writeFileSync(path.join(dir, 'sudo'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${dir}/args"\n`, { mode: 0o755 });
  return { dir, args: () => fs.readFileSync(path.join(dir, 'args'), 'utf8').trimEnd().split('\n') };
}

const runShell = (command, env) => new Promise((resolve, reject) => {
  execFile('/bin/sh', ['-c', command], { env }, (error) => (error ? reject(error) : resolve()));
});

test('the run\'s sudo adds -A, unless the caller already passes -A or -S', async () => {
  const real = recordingSudo();
  const server = startPasswordServer('pw', { baseEnv: { PATH: `${real.dir}:/usr/bin:/bin` } });
  await server.listening;
  const binDir = server.env.PATH.split(':')[0];
  assert.equal(path.dirname(binDir), path.dirname(server.env[SOCKET_ENV]));
  assert.equal(server.env.PATH, `${binDir}:${real.dir}:/usr/bin:/bin`);
  assert.equal(fs.readFileSync(path.join(binDir, 'sudo'), 'utf8').includes('pw'), false);

  const cases = [
    // deploy.py's calls, as `bash -c` runs them.
    ['sudo -v', ['-A', '-v']],
    ['sudo apt-get install -y ansible-core', ['-A', 'apt-get', 'install', '-y', 'ansible-core']],
    // Ansible's become writes the password to sudo's stdin itself.
    ['sudo -H -S -p "[sudo via ansible] password:" -u root /bin/sh -c "echo -S"',
      ['-H', '-S', '-p', '[sudo via ansible] password:', '-u', 'root', '/bin/sh', '-c', 'echo -S']],
    ['sudo -kS true', ['-kS', 'true']],
    // The playbook's become with ANSIBLE_BECOME_FLAGS already asks for askpass.
    ['sudo -H -A -u root /bin/sh -c "echo ok"', ['-H', '-A', '-u', 'root', '/bin/sh', '-c', 'echo ok']],
    ['sudo -kA true', ['-kA', 'true']],
    ['sudo --stdin true', ['--stdin', 'true']],
    // A value or command argument that looks like -S does not count.
    ['sudo -u -S true', ['-A', '-u', '-S', 'true']],
    ['sudo grep -A 2 x', ['-A', 'grep', '-A', '2', 'x']],
    ['sudo grep -S x', ['-A', 'grep', '-S', 'x']],
    ['sudo -- -S', ['-A', '--', '-S']],
  ];
  for (const [command, expected] of cases) {
    await runShell(command, server.env);
    assert.deepEqual(real.args(), expected, command);
  }

  server.close();
  assert.equal(fs.existsSync(binDir), false);
});

test('without a sudo on PATH the run\'s PATH is left alone', async () => {
  const server = startPasswordServer('pw', { baseEnv: { PATH: fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-nosudo-')) } });
  await server.listening;
  assert.equal('PATH' in server.env, false);
  server.close();
});

test('a cloud run leaves the playbook\'s become flags to Ansible', async () => {
  const server = startPasswordServer('pw', { ansibleBecome: false });
  await server.listening;
  assert.equal(server.env.SUDO_ASKPASS, ASKPASS);
  assert.equal('ANSIBLE_BECOME_FLAGS' in server.env, false);
  server.close();
});

test('names what a cloud run installs with apt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-tools-'));
  const tool = (name) => fs.writeFileSync(path.join(dir, name), '#!/bin/sh\n', { mode: 0o755 });
  assert.deepEqual(cloudInstalls(dir), ['Ansible', 'Terraform']);
  tool('ansible');
  tool('ansible-playbook');
  assert.deepEqual(cloudInstalls(dir), ['Terraform']);
  tool('terraform');
  assert.deepEqual(cloudInstalls(dir), []);
});
