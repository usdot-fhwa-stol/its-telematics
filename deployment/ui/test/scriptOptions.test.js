'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const builtIn = require('../electron/cliOptions');
const { DEPLOY_SCRIPT, ValidationError, validateParams } = require('../electron/cliBridge');
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
  fs.mkdirSync(path.join(root, path.dirname(DEPLOY_SCRIPT)), { recursive: true });
  fs.writeFileSync(path.join(root, DEPLOY_SCRIPT), script);
  return root;
}

test('the real deploy.py lists the choices the app has labels for', async () => {
  const options = await loadScriptOptions({ repoRoot: REPO_ROOT });
  assert.equal(options.source, 'deploy.py', options.notice);
  assert.equal(options.notice, null);
  assert.deepEqual(values(options.ENVIRONMENTS), values(builtIn.ENVIRONMENTS));
  assert.deepEqual(values(options.USE_CASES), values(builtIn.USE_CASES));
  assert.deepEqual(values(options.TARGETS), values(builtIn.TARGETS));
  assert.ok(values(options.ENVIRONMENTS).includes(builtIn.DEPLOY_ENVIRONMENT));
});

test('lists the desired services in the form\'s order, with their services', () => {
  const options = optionsFromListing(listing());
  assert.deepEqual(options.USE_CASES.map((option) => [option.value, option.label]), [
    ['core', 'Core Services'],
    ['rsu_integration', 'RSU Management Services'],
    ['all', 'All Services'],
  ]);
  const [core, rsu, all] = options.USE_CASES;
  assert.match(core.description, /^All services needed to deploy the Telematics application/);
  assert.ok(core.services.includes('Messaging Server'));
  assert.ok(!core.services.includes('RSU Management Service'));
  assert.ok(rsu.services.includes('RSU Management Service') && rsu.services.includes('InfluxDB v3'));
  assert.ok(!rsu.services.includes('Messaging Server'));
  assert.deepEqual([...all.services].sort(), [...new Set([...core.services, ...rsu.services])].sort());
});

test('follows choices added to or removed from deploy.py', () => {
  const options = optionsFromListing(listing({ environments: ['dev', 'staging'], useCases: ['core'] }));
  assert.deepEqual(options.ENVIRONMENTS, [{ value: 'dev', label: 'dev' }, { value: 'staging', label: 'staging' }]);
  assert.deepEqual(values(options.USE_CASES), ['core']);
  assert.equal(options.USE_CASES[0].label, 'Core Services');
  const unknown = optionsFromListing(listing({ useCases: ['core', 'edge'] })).USE_CASES[1];
  assert.deepEqual(unknown, { value: 'edge', label: 'edge', description: '', services: [] });
});

test('offers only the targets deploy.py accepts', () => {
  const localOnly = optionsFromListing(listing({ targets: ['localhost'] }));
  assert.deepEqual(values(localOnly.TARGETS), ['on-premise']);
  assert.deepEqual(values(optionsFromListing(listing({ targets: ['remote', 'cloud'] })).TARGETS), ['cloud']);

  // remote is left out on purpose, so only other unknown targets are mentioned.
  assert.equal(optionsFromListing(listing()).notice, null);
  const extra = optionsFromListing(listing({ targets: ['localhost', 'remote', 'cloud', 'edge'] }));
  assert.match(extra.notice, /accepts --target edge, which/);
});

test('validates against the listed choices', () => {
  const params = { target: 'on-premise', useCase: 'core' };
  assert.equal(validateParams(params, optionsFromListing(listing())).environment, 'prod');
  // The app always sends prod, so a deploy.py without it can't be used.
  assert.throws(() => validateParams(params, optionsFromListing(listing({ environments: ['dev'] }))),
    /does not accept --environment prod/);
  assert.throws(() => validateParams(params, optionsFromListing(listing({ useCases: ['all'] }))), ValidationError);
});

test('rejects a listing in another format', () => {
  assert.throws(() => optionsFromListing({ schema_version: 2, options: [] }), /expected format/);
  assert.throws(() => optionsFromListing({ schema_version: 1, options: [] }), /no choices for --environment/);
});

test('falls back to the built-in lists for an older deploy.py', async () => {
  const older = fakeRepo('import sys\nsys.exit(2)\n');
  const options = await loadScriptOptions({ repoRoot: older });
  assert.equal(options.source, 'built-in');
  assert.match(options.notice, /exited with code 2/);
  assert.deepEqual(options.TARGETS, builtIn.TARGETS);

  const noisy = fakeRepo('print("not json")\n');
  assert.match((await loadScriptOptions({ repoRoot: noisy })).notice, /not JSON/);
});

test('offers secret overrides only when deploy.py reads them from standard input', async () => {
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

test('offers the cloud fields only when deploy.py lists its cloud options', async () => {
  const withCloud = listing();
  withCloud.options.push(
    { name: '--key-path', choices: null, default: '' },
    { name: '--distributed', choices: null, default: false },
    { name: '--centralized', choices: null, default: false },
    { name: '--aws-access-key-id', choices: null, default: '' },
    { name: '--aws-region', choices: null, default: 'us-east-1' },
  );
  const options = optionsFromListing(withCloud);
  assert.equal(options.CLOUD.defaultRegion, 'us-east-1');
  assert.equal(options.CLOUD.defaultTopology, 'centralized');
  assert.deepEqual(values(options.CLOUD.TOPOLOGIES), ['centralized', 'distributed']);
  assert.deepEqual(options.CLOUD.TOPOLOGIES.map((option) => option.label), ['Single Server', 'Multiple Servers']);
  assert.match(options.CLOUD.TOPOLOGIES[1].details, /m5n\.8xlarge.*t2\.2xlarge.*t2\.large/);
  assert.equal(options.TARGETS.find((option) => option.value === 'cloud').label, builtIn.CLOUD_TARGET_LABEL);

  assert.equal(options.CLOUD.namedProfiles, false);
  withCloud.options.push({ name: '--aws-profile', choices: null, default: null }, { name: '--volume-prune', choices: null, default: true });
  assert.equal(optionsFromListing(withCloud).CLOUD.namedProfiles, true);
  assert.equal(optionsFromListing(withCloud).prunesVolumes, true);
  assert.equal(options.prunesVolumes, false);

  assert.equal(optionsFromListing(listing()).CLOUD, null);
});

test('the real deploy.py lists its cloud options and --volume-prune', async () => {
  const real = await loadScriptOptions({ repoRoot: REPO_ROOT });
  assert.equal(real.source, 'deploy.py', real.notice);
  assert.equal(real.CLOUD.defaultRegion, 'us-east-1');
  assert.deepEqual(values(real.CLOUD.TOPOLOGIES), ['centralized', 'distributed']);
  assert.equal(real.prunesVolumes, true);
});

test('says why the script could not list its options', async () => {
  const crashing = fakeRepo('import sys\nprint("Traceback (most recent call last):", file=sys.stderr)\n'
    + 'print("AttributeError: module \'argparse\' has no attribute \'BooleanOptionalAction\'", file=sys.stderr)\nsys.exit(1)\n');
  assert.match((await loadScriptOptions({ repoRoot: crashing })).notice,
    /exited with code 1: AttributeError: module 'argparse' has no attribute 'BooleanOptionalAction'/);
});
