'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const builtIn = require('../electron/cliOptions');
const { SETUP_SCRIPT, ValidationError, validateParams } = require('../electron/cliBridge');
const { optionsFromListing, loadScriptOptions } = require('../electron/scriptOptions');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const values = (list) => list.map((option) => option.value);

function listing({ environments = ['dev', 'test', 'prod'], targets = ['localhost', 'remote', 'cloud'],
  useCases = ['all', 'core', 'rsu_integration'] } = {}) {
  return {
    schema_version: 1,
    options: [
      { name: '--environment', choices: environments, default: 'prod' },
      { name: '--target', choices: targets, default: 'localhost' },
      { name: '--use-case', choices: useCases, default: 'all' },
      { name: '--remote-io', choices: null, default: '' },
    ],
  };
}

function fakeRepo(script) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-options-'));
  fs.mkdirSync(path.join(root, path.dirname(SETUP_SCRIPT)), { recursive: true });
  fs.writeFileSync(path.join(root, SETUP_SCRIPT), script);
  return root;
}

test('the real setup.py lists the choices the app has labels for', async () => {
  const options = await loadScriptOptions({ repoRoot: REPO_ROOT });
  assert.equal(options.source, 'setup.py', options.notice);
  assert.equal(options.notice, null);
  assert.deepEqual(values(options.ENVIRONMENTS), values(builtIn.ENVIRONMENTS));
  assert.deepEqual(values(options.USE_CASES), values(builtIn.USE_CASES));
  assert.deepEqual(values(options.TARGETS), values(builtIn.TARGETS));
  assert.deepEqual(values(options.DEPLOY_TO), values(builtIn.DEPLOY_TO));
  assert.equal(options.ENVIRONMENTS.find((option) => option.value === 'prod').label, 'prod (default)');
});

test('follows choices added to or removed from setup.py', () => {
  const options = optionsFromListing(listing({ environments: ['dev', 'staging'], useCases: ['core'] }));
  assert.deepEqual(options.ENVIRONMENTS, [{ value: 'dev', label: 'dev' }, { value: 'staging', label: 'staging' }]);
  assert.deepEqual(values(options.USE_CASES), ['core']);
  assert.match(options.USE_CASES[0].label, /^core: /);
});

test('offers only the targets setup.py accepts', () => {
  const localOnly = optionsFromListing(listing({ targets: ['localhost'] }));
  assert.deepEqual(values(localOnly.TARGETS), ['on-premise']);
  assert.deepEqual(values(localOnly.DEPLOY_TO), ['local']);

  const extra = optionsFromListing(listing({ targets: ['localhost', 'remote', 'cloud', 'edge'] }));
  assert.match(extra.notice, /--target edge/);
});

test('validates against the listed choices', () => {
  const options = optionsFromListing(listing({ environments: ['dev'] }));
  const params = { target: 'on-premise', deployTo: 'local', environment: 'prod', useCase: 'core' };
  assert.throws(() => validateParams(params, options), ValidationError);
  assert.equal(validateParams({ ...params, environment: 'dev' }, options).environment, 'dev');
});

test('rejects a listing in another format', () => {
  assert.throws(() => optionsFromListing({ schema_version: 2, options: [] }), /expected format/);
  assert.throws(() => optionsFromListing({ schema_version: 1, options: [] }), /no choices for --environment/);
});

test('falls back to the built-in lists for an older setup.py', async () => {
  const older = fakeRepo('import sys\nsys.exit(2)\n');
  const options = await loadScriptOptions({ repoRoot: older });
  assert.equal(options.source, 'built-in');
  assert.match(options.notice, /exited with code 2/);
  assert.deepEqual(options.TARGETS, builtIn.TARGETS);

  const noisy = fakeRepo('print("not json")\n');
  assert.match((await loadScriptOptions({ repoRoot: noisy })).notice, /not JSON/);
});

test('offers secret overrides only when setup.py reads them from standard input', async () => {
  const real = await loadScriptOptions({ repoRoot: REPO_ROOT });
  assert.deepEqual(real.SECRET_KEYS, ['mysql_password', 'mysql_root_password', 'grafana_secret_key', 'influx_admin_token']);

  const secretOption = { name: '--secret-override', choices: null, default: [], keys: ['mysql_password'] };
  const withoutStdin = listing();
  withoutStdin.options.push(secretOption);
  assert.deepEqual(optionsFromListing(withoutStdin).SECRET_KEYS, []);
  withoutStdin.options.push({ name: '--secret-overrides-stdin', choices: null, default: false });
  assert.deepEqual(optionsFromListing(withoutStdin).SECRET_KEYS, ['mysql_password']);

  const older = fakeRepo('import sys\nsys.exit(2)\n');
  assert.deepEqual((await loadScriptOptions({ repoRoot: older })).SECRET_KEYS, []);
});
