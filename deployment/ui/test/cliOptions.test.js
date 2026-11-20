'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const { TOPOLOGIES, builtEnvironment } = require('../electron/cliOptions');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

test('the cloud confirmation names the instance types deploy.py creates', () => {
  const script = fs.readFileSync(path.join(REPO_ROOT, 'deployment', 'scripts', 'deploy.py'), 'utf8');
  const roles = (name) => {
    const block = script.match(new RegExp(`^${name} = \\{([^}]*)\\}`, 'm'));
    assert.ok(block, `${name} not found in deploy.py`);
    return [...block[1].matchAll(/"([a-z0-9]+\.[a-z0-9]+)"/g)].map((match) => match[1]);
  };
  const details = (value) => TOPOLOGIES.find((option) => option.value === value).details;
  for (const type of roles('CENTRALIZED_ROLES')) assert.ok(details('centralized').includes(type), type);
  for (const type of roles('DISTRIBUTED_ROLES')) assert.ok(details('distributed').includes(type), type);
});

test('a packaged app deploys the environment its bundle was built for', (t) => {
  const resources = fs.mkdtempSync(path.join(os.tmpdir(), 'resources-'));
  t.after(() => fs.rmSync(resources, { recursive: true, force: true }));
  const writeManifest = (manifest) => {
    fs.mkdirSync(path.join(resources, 'bundle'), { recursive: true });
    fs.writeFileSync(path.join(resources, 'bundle', 'manifest.json'), JSON.stringify(manifest));
  };

  assert.equal(builtEnvironment(undefined), 'prod');
  assert.equal(builtEnvironment(resources), 'prod'); // no bundle
  for (const environment of ['dev', 'test', 'prod']) {
    writeManifest({ deployEnvironment: environment });
    assert.equal(builtEnvironment(resources), environment);
  }
  writeManifest({}); // a bundle built before the field existed
  assert.equal(builtEnvironment(resources), 'prod');
  writeManifest({ deployEnvironment: 'staging' });
  assert.equal(builtEnvironment(resources), 'prod');
});
