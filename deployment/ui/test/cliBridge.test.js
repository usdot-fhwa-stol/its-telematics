'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  ValidationError, validateParams, buildArgs, formatCommand, parseOutput, runSetup,
} = require('../electron/cliBridge');

const localCore = { target: 'on-premise', deployTo: 'local', environment: 'dev', useCase: 'core' };

function errorsFor(params) {
  try {
    validateParams(params);
  } catch (error) {
    assert.ok(error instanceof ValidationError);
    return error.errors;
  }
  assert.fail('expected a ValidationError');
}

test('builds the README examples for this machine', () => {
  assert.deepEqual(buildArgs(validateParams(localCore)),
    ['--environment', 'dev', '--target', 'localhost', '--use-case', 'core']);
  assert.deepEqual(buildArgs(validateParams({ ...localCore, useCase: 'rsu_integration' })),
    ['--environment', 'dev', '--target', 'localhost', '--use-case', 'rsu_integration']);
});

test('formats the command as typed from the repository root', () => {
  assert.equal(formatCommand(buildArgs(validateParams(localCore))),
    './deployment/scripts/setup.py --environment dev --target localhost --use-case core');
});

test('maps cloud and ignores remote fields for it', () => {
  const valid = validateParams({ target: 'cloud', environment: 'prod', useCase: 'all', remoteIo: 'x' });
  assert.deepEqual(buildArgs(valid), ['--environment', 'prod', '--target', 'cloud', '--use-case', 'all']);
});

test('passes remote values as --flag=value so they cannot become options', () => {
  const valid = validateParams({
    target: 'on-premise', deployTo: 'remote', environment: 'test', useCase: 'all',
    remoteIo: '-h', remoteUser: 'ubuntu',
  });
  assert.deepEqual(buildArgs(valid).slice(-2), ['--remote-io=-h', '--remote-user=ubuntu']);
});

test('reports every missing field at once', () => {
  assert.deepEqual(errorsFor({}), ['Choose a target.', 'Choose an environment.', 'Choose a use case.']);
  assert.deepEqual(errorsFor({ ...localCore, deployTo: 'remote' }),
    ['Host address is required.', 'SSH user is required.']);
});

test('rejects values outside the setup.py choices', () => {
  assert.deepEqual(errorsFor({ ...localCore, environment: 'staging' }), ['Choose an environment.']);
  assert.deepEqual(errorsFor({ ...localCore, target: 'localhost' }), ['Choose a target.']);
  assert.deepEqual(errorsFor({ ...localCore, deployTo: 'elsewhere' }), ['Choose where to deploy.']);
});

test('rejects spaces and control characters in free text', () => {
  const remote = { ...localCore, deployTo: 'remote', remoteUser: 'ubuntu' };
  assert.deepEqual(errorsFor({ ...remote, remoteIo: 'host --target cloud' }),
    ['Host address must not contain spaces or control characters.']);
  assert.deepEqual(errorsFor({ ...remote, remoteIo: 'host\n--x' }),
    ['Host address must not contain spaces or control characters.']);
});

test('checks the SSH key file', () => {
  const remote = { ...localCore, deployTo: 'remote', remoteIo: '10.0.0.5', remoteUser: 'ubuntu' };
  assert.deepEqual(errorsFor({ ...remote, keyPath: 'id_rsa' }), ['SSH key must be an absolute path.']);
  assert.deepEqual(errorsFor({ ...remote, keyPath: '/no/such/key' }),
    ['SSH key file does not exist or is not readable.']);
  assert.deepEqual(errorsFor({ ...remote, keyPath: os.tmpdir() }), ['SSH key must be a file.']);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-'));
  const key = path.join(dir, 'id_ed25519');
  fs.writeFileSync(key, 'key', { mode: 0o600 });
  assert.equal(buildArgs(validateParams({ ...remote, keyPath: key })).at(-1), `--key-path=${key}`);
});

test('parses the markers setup.py prints', () => {
  const lines = [
    'Host prerequisites validation: PASS',
    'Configured mysql_password from example default.',
    'Generated runtime configuration: /repo/telematic_system/.env',
    '{"environment": "dev", "target": "localhost", "use_case": "core"}',
    '{"runtime_env_path": "telematic_system/.env", "compose_manifest_paths": []}',
    'error: Docker Compose plugin is not available.',
    'Deployment failed at step: Verify runtime dependencies',
    'Exit code: 2',
    'Hint: Verify Docker daemon access.',
  ].map((text) => ({ stream: 'stdout', text }));
  const summary = parseOutput(lines);
  assert.deepEqual(summary.checks, [{ name: 'Host prerequisites validation', status: 'PASS' }]);
  assert.deepEqual(summary.configuredSecrets, [{ key: 'mysql_password', source: 'example default' }]);
  assert.equal(summary.generatedEnv, '/repo/telematic_system/.env');
  assert.equal(summary.deploymentContext.target, 'localhost');
  assert.equal(summary.manifestReference.runtime_env_path, 'telematic_system/.env');
  assert.deepEqual(summary.errors, ['Docker Compose plugin is not available.']);
  assert.equal(summary.failedStep, 'Verify runtime dependencies');
  assert.equal(summary.reportedExitCode, 2);
  assert.equal(summary.hint, 'Verify Docker daemon access.');
});

// A stand-in setup.py that echoes what it received.
function fakeRepo(exitCode = 0) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  const scripts = path.join(root, 'deployment', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(scripts, 'setup.py'), [
    'import json, os, sys',
    'try:',
    '    os.close(os.open("/dev/tty", os.O_RDWR))',
    '    tty = True',
    'except OSError:',
    '    tty = False',
    'print(json.dumps({"argv": sys.argv[1:], "cwd": os.getcwd(), "askpass": os.environ.get("SUDO_ASKPASS"), "tty": tty}))',
    'print("problem", file=sys.stderr)',
    'sys.stdout.write("no trailing newline")',
    `sys.exit(${exitCode})`,
  ].join('\n'));
  return root;
}

test('runs setup.py without a shell, from the repository root', async () => {
  const repoRoot = fakeRepo();
  const valid = validateParams({
    target: 'on-premise', deployTo: 'remote', environment: 'dev', useCase: 'core',
    remoteIo: '$(touch${IFS}pwned)', remoteUser: 'ubuntu',
  });
  const result = await runSetup(valid, { repoRoot, askpassPath: '/opt/askpass.sh' }).done;

  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  const echoed = JSON.parse(result.lines.find((line) => line.stream === 'stdout').text);
  assert.deepEqual(echoed.argv, [
    '--environment', 'dev', '--target', 'remote', '--use-case', 'core',
    '--remote-io=$(touch${IFS}pwned)', '--remote-user=ubuntu',
  ]);
  assert.equal(echoed.cwd, fs.realpathSync(repoRoot));
  assert.equal(echoed.askpass, '/opt/askpass.sh');
  // With a terminal, sudo would prompt there instead of opening the dialog.
  assert.equal(echoed.tty, false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'pwned')), false);
  assert.ok(result.lines.some((line) => line.stream === 'stderr' && line.text === 'problem'));
  assert.ok(result.lines.some((line) => line.text === 'no trailing newline'));
  assert.equal(result.command,
    "./deployment/scripts/setup.py --environment dev --target remote --use-case core '--remote-io=$(touch${IFS}pwned)' --remote-user=ubuntu");
});

test('reports a failing exit code', async () => {
  const result = await runSetup(validateParams(localCore), { repoRoot: fakeRepo(3) }).done;
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 3);
});

test('stop() ends setup.py and the processes it started', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  const scripts = path.join(repoRoot, 'deployment', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(scripts, 'setup.py'), [
    'import subprocess, sys',
    'helper = subprocess.Popen(["sleep", "30"])',
    'print(helper.pid, flush=True)',
    'helper.wait()',
  ].join('\n'));

  const run = runSetup(validateParams(localCore), { repoRoot });
  const helperPid = await new Promise((resolve) => {
    run.child.stdout.once('data', (chunk) => resolve(Number(String(chunk).trim())));
  });
  run.stop();
  const result = await run.done;

  assert.equal(result.ok, false);
  assert.equal(result.signal, 'SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.throws(() => process.kill(helperPid, 0), { code: 'ESRCH' });
});

test('reports a missing Python', async () => {
  const result = await runSetup(validateParams(localCore), { repoRoot: fakeRepo(), python: 'no-such-python3' }).done;
  assert.equal(result.ok, false);
  assert.equal(result.spawnError, 'no-such-python3 was not found. Install Python 3 and try again.');
});
