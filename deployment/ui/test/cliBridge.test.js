'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  ValidationError, validateParams, buildArgs, formatCommand, parseSteps, parseOutput, parseInventory, runDeploy,
} = require('../electron/cliBridge');

const localCore = { target: 'on-premise', useCase: 'core' };

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
    ['--environment', 'prod', '--target', 'localhost', '--use-case', 'core']);
  assert.deepEqual(buildArgs(validateParams({ ...localCore, useCase: 'rsu_integration' })),
    ['--environment', 'prod', '--target', 'localhost', '--use-case', 'rsu_integration']);
});

test('formats the command as typed from the repository root', () => {
  assert.equal(formatCommand(buildArgs(validateParams(localCore))),
    './deployment/scripts/deploy.py --environment prod --target localhost --use-case core');
});

test('maps cloud and ignores fields from other targets', () => {
  const valid = validateParams({ target: 'cloud', environment: 'prod', useCase: 'all', remoteIo: 'x' });
  assert.deepEqual(buildArgs(valid), ['--environment', 'prod', '--target', 'cloud', '--use-case', 'all']);
});

test('on-premise always deploys to this machine, even with old remote settings', () => {
  const stale = { ...localCore, deployTo: 'remote', remoteIo: '10.0.0.5', remoteUser: 'ubuntu', keyPath: '/no/such/key' };
  assert.deepEqual(buildArgs(validateParams(stale)),
    ['--environment', 'prod', '--target', 'localhost', '--use-case', 'core']);
});

test('reports every missing field at once', () => {
  assert.deepEqual(errorsFor({}), ['Choose a deployment mode.', 'Choose the desired services.']);
});

test('rejects values outside the deploy.py choices', () => {
  assert.deepEqual(errorsFor({ ...localCore, useCase: 'everything' }), ['Choose the desired services.']);
  assert.deepEqual(errorsFor({ ...localCore, target: 'localhost' }), ['Choose a deployment mode.']);
  assert.deepEqual(errorsFor({ ...localCore, target: 'remote' }), ['Choose a deployment mode.']);
});

test('always deploys prod, whatever environment the form or old settings send', () => {
  assert.equal(validateParams({ ...localCore, environment: 'dev' }).environment, 'prod');
  assert.equal(validateParams(localCore).environment, 'prod');
});

test('parses the markers deploy.py prints', () => {
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

// Output of deploy.py's pipeline, as TaskAutomationService prints it.
const pipelineLines = (stream, summaryJson, extra = []) => [
  ...['[1] Verify operating system .. OK', '[2] Install system dependencies ... OK', '[3] Deploy services ',
    '    - Bringing down any running services', '[3] Deploy services ..  OK', ...extra]
    .map((text) => ({ stream: 'stdout', text })),
  ...JSON.stringify(summaryJson, null, 2).split('\n').map((text) => ({ stream, text })),
];

test('parses the pipeline steps and the summary of a successful run', () => {
  const lines = pipelineLines('stdout',
    { overall_status: 'SUCCESS', elapsed_time_seconds: 81.2, active_services: ['nats', 'web_client'], ui_url: 'http://localhost/', diagnostics: null },
    []);
  lines.push({ stream: 'stdout', text: '' }, { stream: 'stdout', text: 'Open the UI: http://localhost/' });
  const summary = parseOutput(lines);
  assert.deepEqual(summary.steps, [
    { name: 'Verify operating system', status: 'OK' },
    { name: 'Install system dependencies', status: 'OK' },
    { name: 'Deploy services', status: 'OK' },
  ]);
  assert.equal(summary.execution.overall_status, 'SUCCESS');
  assert.deepEqual(summary.execution.active_services, ['nats', 'web_client']);
  assert.equal(summary.uiUrl, 'http://localhost/');
});

test('parses the diagnostics of a failed run', () => {
  const lines = pipelineLines('stderr', {
    overall_status: 'FAILED', elapsed_time_seconds: 3, active_services: [], ui_url: null,
    diagnostics: { failed_task_id: 'Pull container images', exit_code: 1, error_stderr: 'manifest unknown', container_logs: null, remediation_hints: ['Check registry rate limits.'] },
  }, ['[4] Pull container images ..... FAILED']);
  const summary = parseOutput(lines);
  assert.deepEqual(summary.steps.at(-1), { name: 'Pull container images', status: 'FAILED' });
  assert.equal(summary.execution.diagnostics.failed_task_id, 'Pull container images');
  assert.deepEqual(summary.execution.diagnostics.remediation_hints, ['Check registry rate limits.']);
  assert.equal(summary.uiUrl, null);
});

test('shows the step that is still running', () => {
  const done = [{ stream: 'stdout', text: '[1] Verify operating system . OK' }];
  assert.deepEqual(parseSteps(done, '[2] Install system dependencies ....'), [
    { name: 'Verify operating system', status: 'OK' },
    { name: 'Install system dependencies', status: 'running' },
  ]);
});

// What a cloud run prints before the numbered pipeline starts.
const cloudLines = (extra = []) => [
  'error: Terraform is not installed or not in PATH; installing it now.',
  'Terraform installation: OK',
  'Host prerequisites validation: PASS',
  'Generated Terraform variables: /repo/deployment/targets/cloud/terraform.tfvars.json',
  'Proposed infrastructure changes:',
  '  create aws_instance.node["all-0"]',
  'Applying the plan.',
  ...extra,
].map((text) => ({ stream: 'stdout', text }));

test('gives the cloud stages before the pipeline steps of their own', () => {
  assert.deepEqual(parseSteps(cloudLines()), [
    { name: 'Install Terraform', status: 'OK' },
    { name: 'Plan AWS infrastructure', status: 'OK' },
    { name: 'Create AWS infrastructure', status: 'running' },
  ]);
  const provisioned = cloudLines([
    'Ansible inventory: /repo/deployment/targets/cloud/inventory.ini',
    '[1] Verify operating system .. OK',
  ]);
  assert.deepEqual(parseSteps(provisioned).slice(2), [
    { name: 'Create AWS infrastructure', status: 'OK' },
    { name: 'Verify operating system', status: 'OK' },
  ]);
  const failed = parseOutput(cloudLines([
    'Provisioning failed; destroying the created resources.',
    'Rollback complete: all created resources were destroyed.',
    'error: Terraform apply failed: UnauthorizedOperation',
    'Deployment failed at step: Provision cloud infrastructure',
    'Exit code: 2',
    'Hint: Review the Terraform output above.',
    'Deployment failed at step: Execute deployment pipeline',
    'Exit code: 2',
    'Hint: Review the diagnostic report and remediation hints printed above.',
  ]));
  assert.deepEqual(failed.steps.at(-1), { name: 'Create AWS infrastructure', status: 'FAILED' });
  assert.equal(failed.failedStep, 'Provision cloud infrastructure');
  assert.equal(failed.hint, 'Review the Terraform output above.');
  assert.equal(failed.rollback, 'complete');
  // The install notice is not an error.
  assert.deepEqual(failed.errors, ['Terraform apply failed: UnauthorizedOperation']);
});

test('reads a failed rollback and its clean-up command', () => {
  const summary = parseOutput(cloudLines([
    'Rollback FAILED. Remove leftovers manually: terraform -chdir=/repo/deployment/infra/terraform/aws destroy -var-file=/v.json',
  ]));
  assert.equal(summary.rollback, 'failed');
  assert.equal(summary.rollbackCommand, 'terraform -chdir=/repo/deployment/infra/terraform/aws destroy -var-file=/v.json');
});

test('lists each instance of the inventory once', () => {
  const inventory = [
    '[ui]',
    '3.1.2.3 role="all" private_ip="10.20.0.5" ansible_user="ubuntu" ansible_ssh_private_key_file="/k"',
    '',
    '[processing]',
    '3.1.2.3 role="all" private_ip="10.20.0.5" ansible_user="ubuntu" ansible_ssh_private_key_file="/k"',
    '4.5.6.7 role="processing" private_ip="10.20.0.6" ansible_user="ubuntu"',
  ].join('\n');
  assert.deepEqual(parseInventory(inventory), [
    { address: '3.1.2.3', role: 'all', privateIp: '10.20.0.5' },
    { address: '4.5.6.7', role: 'processing', privateIp: '10.20.0.6' },
  ]);
});

test('always keeps existing data when the script lists --volume-prune', () => {
  const listed = { ...require('../electron/cliOptions'), SECRET_KEYS: [], prunesVolumes: true };
  assert.equal(buildArgs(validateParams(localCore, listed)).at(-1), '--no-volume-prune');
  // An old saved keepData: false doesn't turn it off.
  assert.equal(buildArgs(validateParams({ ...localCore, keepData: false }, listed)).at(-1), '--no-volume-prune');
  // A deploy.py without the flag gets nothing it can't parse.
  assert.equal(buildArgs(validateParams(localCore)).includes('--no-volume-prune'), false);
});

// A stand-in deploy.py that echoes what it received.
function fakeRepo(exitCode = 0) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  const scripts = path.join(root, 'deployment', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(scripts, 'deploy.py'), [
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

test('runs deploy.py without a shell, from the repository root', async () => {
  const repoRoot = fakeRepo();
  // A free-text value with shell syntax; validateParams would reject this key path, so it is built directly.
  const valid = {
    environment: 'prod', target: 'cloud', useCase: 'core',
    awsRegion: 'us-east-1', topology: 'centralized', keyPath: '/keys/$(touch${IFS}pwned)',
  };
  const outputs = [];
  const result = await runDeploy(valid, {
    repoRoot, extraEnv: { SUDO_ASKPASS: '/opt/askpass.py' }, onOutput: (output) => outputs.push(output),
  }).done;

  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  const echoed = JSON.parse(result.lines.find((line) => line.stream === 'stdout').text);
  assert.deepEqual(echoed.argv, [
    '--environment', 'prod', '--target', 'cloud', '--use-case', 'core',
    '--aws-region=us-east-1', '--centralized', '--key-path=/keys/$(touch${IFS}pwned)',
  ]);
  assert.equal(echoed.cwd, fs.realpathSync(repoRoot));
  assert.equal(echoed.askpass, '/opt/askpass.py');
  assert.ok(outputs.flatMap((output) => output.lines).some((line) => line.text === 'problem'));
  // With a terminal, sudo would prompt there instead of running SUDO_ASKPASS.
  assert.equal(echoed.tty, false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'pwned')), false);
  assert.ok(result.lines.some((line) => line.stream === 'stderr' && line.text === 'problem'));
  assert.ok(result.lines.some((line) => line.text === 'no trailing newline'));
  assert.equal(result.command,
    "./deployment/scripts/deploy.py --environment prod --target cloud --use-case core --aws-region=us-east-1 --centralized '--key-path=/keys/$(touch${IFS}pwned)'");
});

test('reports a failing exit code', async () => {
  const result = await runDeploy(validateParams(localCore), { repoRoot: fakeRepo(3) }).done;
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 3);
});

test('stop() ends deploy.py and the processes it started', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  const scripts = path.join(repoRoot, 'deployment', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(scripts, 'deploy.py'), [
    'import subprocess, sys',
    'helper = subprocess.Popen(["sleep", "30"])',
    'print(helper.pid, flush=True)',
    'helper.wait()',
  ].join('\n'));

  const run = runDeploy(validateParams(localCore), { repoRoot });
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
  const result = await runDeploy(validateParams(localCore), { repoRoot: fakeRepo(), python: 'no-such-python3' }).done;
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
  // A deploy.py without --secret-overrides-stdin lists no keys.
  assert.match(errors({ mysql_password: 'hunter2' }, undefined), /does not accept/);
  assert.match(errors({ mysql_password: 'two\nlines' }, secretOptions), /line breaks/);
  assert.match(errors({ mysql_password: 'x'.repeat(4097) }, secretOptions), /4096 characters/);
  assert.equal(/hunter2/.test(errors({ influx_admin_token: 'hunter2' }, secretOptions)), false);
});

test('sends secret overrides on standard input only', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-repo-'));
  fs.mkdirSync(path.join(root, 'deployment', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'deployment', 'scripts', 'deploy.py'), [
    'import json, os, sys',
    'with open("received-stdin", "w") as received:',
    '    received.write(sys.stdin.read())',
    'print(json.dumps({"argv": sys.argv[1:], "env": any("s3cret" in value for value in os.environ.values())}))',
  ].join('\n'));
  const valid = validateParams({ ...localCore, secretOverrides: { mysql_password: 's3cret"\\' } }, secretOptions);
  const run = runDeploy(valid, { repoRoot: root });
  assert.equal(run.child.spawnargs.some((arg) => arg.includes('s3cret')), false);
  const result = await run.done;
  const echoed = JSON.parse(result.lines[0].text);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'received-stdin'), 'utf8')), { mysql_password: 's3cret"\\' });
  assert.equal(echoed.argv.at(-1), '--secret-overrides-stdin');
  assert.equal(echoed.env, false);
  assert.equal(JSON.stringify(result).includes('s3cret'), false);
});

// Options as scriptOptions.js builds them when deploy.py lists its cloud options.
const builtIn = require('../electron/cliOptions');
const cloudOptions = {
  ...builtIn,
  SECRET_KEYS: [],
  CLOUD: {
    defaultRegion: 'us-east-1',
    defaultTopology: 'centralized',
    TOPOLOGIES: builtIn.TOPOLOGIES,
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
  assert.deepEqual(errors({ topology: 'edge' }), ['Choose a server setup.']);
  // The form has no profile field: an old saved profile is ignored.
  assert.deepEqual(errors({ awsProfile: 'work' }), []);
  assert.deepEqual(errors({ keyPath: '' }), ['Choose the SSH key for the instances.']);
  assert.deepEqual(errors({ keyPath: '/no/such/key' }), ['SSH key file does not exist or is not readable.']);
  assert.equal(validateParams({ ...params, awsRegion: 'us-gov-west-1' }, cloudOptions, { env }).awsRegion, 'us-gov-west-1');

  const missing = cloudFixture({ credentials: null });
  assert.deepEqual(errors({}, missing.env), ['Add AWS credentials for the default profile.']);
});

test('keeps the plain cloud command for a deploy.py without cloud options', () => {
  const { params } = cloudFixture();
  assert.deepEqual(buildArgs(validateParams(params)), ['--environment', 'prod', '--target', 'cloud', '--use-case', 'all']);
});

test('always uses the default profile, also when deploy.py takes --aws-profile', () => {
  const { params, env, key } = cloudFixture({ credentials: null });
  fs.writeFileSync(env.AWS_CONFIG_FILE, '[default]\nsso_session = lab\n[profile lab-admin]\nsso_session = lab\n');
  const named = { ...cloudOptions, CLOUD: { ...cloudOptions.CLOUD, namedProfiles: true } };
  assert.deepEqual(buildArgs(validateParams(params, named, { env })).slice(6), [
    '--aws-profile=default', '--aws-region=us-west-2', '--distributed', `--key-path=${key}`,
  ]);
  // A profile saved by an earlier version is ignored.
  assert.equal(buildArgs(validateParams({ ...params, awsProfile: 'lab-admin' }, named, { env }))[6], '--aws-profile=default');
  // Without --aws-profile, the same SSO default profile is not enough.
  assert.throws(() => validateParams(params, cloudOptions, { env }), /Add AWS credentials for the default profile/);

  fs.writeFileSync(env.AWS_CONFIG_FILE, '[default]\nregion = x\n');
  assert.throws(() => validateParams(params, named, { env }), /default AWS profile has no credentials deploy.py can use/);
});
