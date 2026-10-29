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

const withSecrets = { SECRET_KEYS: ['mysql_password', 'grafana_secret_key'] };
const secretOptions = { ...require('../electron/cliOptions'), ...withSecrets };

test('keeps secret override values off the command line', () => {
  const valid = validateParams({
    ...localCore, secretOverrides: { mysql_password: 'p@ss word', grafana_secret_key: '' },
  }, secretOptions);
  assert.deepEqual(valid.secretOverrides, { mysql_password: 'p@ss word' });
  const args = buildArgs(valid);
  assert.equal(args.at(-1), '--secret-overrides-stdin');
  assert.equal(args.some((arg) => arg.includes('p@ss')), false);
  assert.equal(formatCommand(args).includes('p@ss'), false);
  // No values, no flag.
  assert.equal(buildArgs(validateParams({ ...localCore, secretOverrides: { mysql_password: '' } }, secretOptions))
    .includes('--secret-overrides-stdin'), false);
});

test('rejects secret overrides the script cannot take, without echoing values', () => {
  const errors = (overrides, options) => {
    try {
      validateParams({ ...localCore, secretOverrides: overrides }, options);
    } catch (error) {
      return error.errors.join(' ');
    }
    return '';
  };
  assert.match(errors({ influx_admin_token: 'hunter2' }, secretOptions), /does not accept a secret override for influx_admin_token/);
  // A setup.py without --secret-overrides-stdin lists no keys.
  assert.match(errors({ mysql_password: 'hunter2' }, undefined), /does not accept/);
  assert.match(errors({ mysql_password: 'two\nlines' }, secretOptions), /line breaks/);
  assert.match(errors({ mysql_password: 'x'.repeat(4097) }, secretOptions), /4096 characters/);
  assert.equal(/hunter2/.test(errors({ influx_admin_token: 'hunter2' }, secretOptions)), false);
});

test('sends secret overrides on standard input only', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  fs.mkdirSync(path.join(root, 'deployment', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'deployment', 'scripts', 'setup.py'), [
    'import json, os, sys',
    'with open("received-stdin", "w") as received:',
    '    received.write(sys.stdin.read())',
    'print(json.dumps({"argv": sys.argv[1:], "env": any("s3cret" in value for value in os.environ.values())}))',
  ].join('\n'));
  const valid = validateParams({ ...localCore, secretOverrides: { mysql_password: 's3cret"\\' } }, secretOptions);
  const run = runSetup(valid, { repoRoot: root });
  assert.equal(run.child.spawnargs.some((arg) => arg.includes('s3cret')), false);
  const result = await run.done;
  const echoed = JSON.parse(result.lines[0].text);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'received-stdin'), 'utf8')), { mysql_password: 's3cret"\\' });
  assert.equal(echoed.argv.at(-1), '--secret-overrides-stdin');
  assert.equal(echoed.env, false);
  assert.equal(JSON.stringify(result).includes('s3cret'), false);
});

// Options as scriptOptions.js builds them when setup.py lists its cloud options (PR #336).
const builtIn = require('../electron/cliOptions');
const cloudOptions = {
  ...builtIn,
  SECRET_KEYS: [],
  CLOUD: {
    defaultRegion: 'us-east-1',
    defaultTopology: 'centralized',
    TOPOLOGIES: builtIn.TOPOLOGIES,
    PROFILES: [{ value: 'default', label: 'default' }],
  },
};

function cloudFixture({ credentials = '[default]\naws_access_key_id = AKIAEXAMPLEKEYID0001\naws_secret_access_key = wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-cloud-'));
  const key = path.join(dir, 'telematics.pub');
  fs.writeFileSync(key, 'ssh-ed25519 AAAA test\n');
  const file = path.join(dir, 'credentials');
  if (credentials !== null) fs.writeFileSync(file, credentials, { mode: 0o600 });
  return {
    params: {
      target: 'cloud', environment: 'prod', useCase: 'all',
      awsRegion: 'us-west-2', awsProfile: 'default', topology: 'distributed', keyPath: key,
    },
    env: { AWS_SHARED_CREDENTIALS_FILE: file, AWS_CONFIG_FILE: path.join(dir, 'config') },
    key,
  };
}

test('builds the cloud arguments, and never passes AWS access keys', () => {
  const { params, env, key } = cloudFixture();
  const args = buildArgs(validateParams(params, cloudOptions, { env }));
  assert.deepEqual(args, [
    '--environment', 'prod', '--target', 'cloud', '--use-case', 'all',
    '--aws-region=us-west-2', '--distributed', `--key-path=${key}`,
  ]);
  assert.equal(args.some((arg) => /aws-(access|secret)/.test(arg) || arg.includes('AKIA')), false);
});

test('checks the cloud fields', () => {
  const { params, env } = cloudFixture();
  const errors = (overrides, fixtureEnv = env) => {
    try {
      validateParams({ ...params, ...overrides }, cloudOptions, { env: fixtureEnv });
    } catch (error) {
      return error.errors;
    }
    return [];
  };
  assert.deepEqual(errors({ awsRegion: 'us east 1' }), ['AWS region must not contain spaces or control characters.']);
  assert.deepEqual(errors({ awsRegion: 'mars-1' }), ['AWS region must look like us-east-1.']);
  assert.deepEqual(errors({ awsRegion: '' }), ['AWS region is required.']);
  assert.deepEqual(errors({ topology: 'edge' }), ['Choose a topology.']);
  assert.deepEqual(errors({ awsProfile: 'work' }), ['Choose an AWS profile.']);
  assert.deepEqual(errors({ keyPath: '' }), ['Choose the SSH key for the instances.']);
  assert.deepEqual(errors({ keyPath: '/no/such/key' }), ['SSH key file does not exist or is not readable.']);
  assert.equal(validateParams({ ...params, awsRegion: 'us-gov-west-1' }, cloudOptions, { env }).awsRegion, 'us-gov-west-1');

  const missing = cloudFixture({ credentials: null });
  assert.deepEqual(errors({}, missing.env), ['Add AWS credentials for the default profile.']);
});

test('keeps the plain cloud command for a setup.py without cloud options', () => {
  const { params } = cloudFixture();
  assert.deepEqual(buildArgs(validateParams(params)), ['--environment', 'prod', '--target', 'cloud', '--use-case', 'all']);
});

test('passes the chosen profile when setup.py takes --aws-profile', () => {
  const { params, env, key } = cloudFixture({ credentials: null });
  fs.writeFileSync(env.AWS_CONFIG_FILE, '[default]\nsso_session = lab\n[profile lab-admin]\nsso_session = lab\n[profile empty]\nregion = x\n');
  const named = { ...cloudOptions, CLOUD: { ...cloudOptions.CLOUD, namedProfiles: true } };
  assert.deepEqual(buildArgs(validateParams(params, named, { env })).slice(6), [
    '--aws-profile=default', '--aws-region=us-west-2', '--distributed', `--key-path=${key}`,
  ]);
  assert.equal(buildArgs(validateParams({ ...params, awsProfile: 'lab-admin' }, named, { env }))[6], '--aws-profile=lab-admin');
  const errors = (awsProfile) => {
    try {
      validateParams({ ...params, awsProfile }, named, { env });
    } catch (error) {
      return error.errors;
    }
    return [];
  };
  assert.deepEqual(errors('empty'), ['The empty AWS profile has no credentials setup.py can use.']);
  assert.deepEqual(errors('nope'), ['Choose an AWS profile.']);
  // Without --aws-profile, the same SSO default profile is not enough.
  assert.deepEqual(errors('default'), []);
  assert.throws(() => validateParams(params, cloudOptions, { env }), /Add AWS credentials for the default profile/);
});
