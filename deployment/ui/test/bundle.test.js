'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  BundleError, INSTALLED_MANIFEST, defaultWorkingCopy, installBundle,
} = require('../electron/bundle');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-bundle-'));
}

// A bundle as scripts/stage-bundle.mjs writes it.
function makeBundle(version, files) {
  const dir = tempDir();
  for (const [file, { content, mode = 0o644 }] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content, { mode });
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version, files: Object.keys(files) }));
  return dir;
}

const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');

test('installs the bundle into an empty working copy', () => {
  const source = makeBundle('v1', {
    'deployment/scripts/deploy.py': { content: 'print(1)\n', mode: 0o755 },
    'telematic_system/docker-compose.yml': { content: 'services: {}\n' },
  });
  const target = path.join(tempDir(), 'telematics-deploy');
  assert.deepEqual(installBundle(source, target), { version: 'v1', updated: true });
  assert.equal(read(target, 'deployment/scripts/deploy.py'), 'print(1)\n');
  assert.equal(fs.statSync(path.join(target, 'deployment/scripts/deploy.py')).mode & 0o777, 0o755);
  assert.equal(fs.statSync(path.join(target, 'telematic_system/docker-compose.yml')).mode & 0o777, 0o644);
  assert.equal(JSON.parse(read(target, INSTALLED_MANIFEST)).version, 'v1');
});

test('does nothing when the same version is installed', () => {
  const source = makeBundle('v1', { 'deployment/scripts/deploy.py': { content: 'print(1)\n' } });
  const target = tempDir();
  installBundle(source, target);
  fs.writeFileSync(path.join(target, 'deployment/scripts/deploy.py'), 'edited\n');
  assert.deepEqual(installBundle(source, target), { version: 'v1', updated: false });
  assert.equal(read(target, 'deployment/scripts/deploy.py'), 'edited\n');
});

test('an update replaces bundled files, removes dropped ones and keeps generated ones', () => {
  const target = tempDir();
  installBundle(makeBundle('v1', {
    'deployment/scripts/deploy.py': { content: 'old\n' },
    'deployment/scripts/removed.py': { content: 'gone\n' },
  }), target);
  // What deploy.py writes while running: not part of any bundle.
  fs.mkdirSync(path.join(target, 'telematic_system/secrets'), { recursive: true });
  fs.writeFileSync(path.join(target, 'telematic_system/.env'), 'A=1\n');
  fs.writeFileSync(path.join(target, 'telematic_system/secrets/mysql_password.txt'), 'secret\n');
  fs.mkdirSync(path.join(target, 'deployment/infra/terraform/aws'), { recursive: true });
  fs.writeFileSync(path.join(target, 'deployment/infra/terraform/aws/terraform.tfstate'), '{}');

  assert.deepEqual(installBundle(makeBundle('v2', {
    'deployment/scripts/deploy.py': { content: 'new\n' },
    'deployment/scripts/added.py': { content: 'added\n' },
  }), target), { version: 'v2', updated: true });

  assert.equal(read(target, 'deployment/scripts/deploy.py'), 'new\n');
  assert.equal(read(target, 'deployment/scripts/added.py'), 'added\n');
  assert.equal(fs.existsSync(path.join(target, 'deployment/scripts/removed.py')), false);
  assert.equal(read(target, 'telematic_system/.env'), 'A=1\n');
  assert.equal(read(target, 'telematic_system/secrets/mysql_password.txt'), 'secret\n');
  assert.equal(read(target, 'deployment/infra/terraform/aws/terraform.tfstate'), '{}');
});

test('reinstalls over an unreadable installed manifest', () => {
  const source = makeBundle('v1', { 'deployment/scripts/deploy.py': { content: 'print(1)\n' } });
  const target = tempDir();
  fs.writeFileSync(path.join(target, INSTALLED_MANIFEST), 'not json');
  assert.equal(installBundle(source, target).updated, true);
  assert.equal(read(target, 'deployment/scripts/deploy.py'), 'print(1)\n');
});

test('rejects a missing bundle and paths that leave the working copy', () => {
  assert.throws(() => installBundle(tempDir(), tempDir()), BundleError);
  const source = tempDir();
  fs.writeFileSync(path.join(source, 'manifest.json'), JSON.stringify({ version: 'v1', files: ['../escape.txt'] }));
  const target = path.join(tempDir(), 'copy');
  assert.throws(() => installBundle(source, target), /outside the bundle/);
  assert.equal(fs.existsSync(path.join(target, '..', 'escape.txt')), false);
});

test('the working copy follows XDG_DATA_HOME', () => {
  assert.equal(defaultWorkingCopy({ XDG_DATA_HOME: '/data' }), path.join('/data', 'telematics-deploy'));
  assert.equal(defaultWorkingCopy({}), path.join(os.homedir(), '.local', 'share', 'telematics-deploy'));
  assert.equal(defaultWorkingCopy({ XDG_DATA_HOME: 'relative' }), path.join(os.homedir(), '.local', 'share', 'telematics-deploy'));
});
