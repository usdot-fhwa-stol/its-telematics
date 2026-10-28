'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  loadTargetSettings, saveTargetSettings, listServers, rememberServer, touchServer, forgetServer,
} = require('../electron/settings');

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-settings-'));
const later = () => new Promise((resolve) => setTimeout(resolve, 5));

test('saves only the non-secret target fields', () => {
  const dir = tempDir();
  saveTargetSettings(dir, {
    target: 'on-premise', environment: 'dev', useCase: 'core', deployTo: 'local', password: 'never-saved',
  });
  const saved = loadTargetSettings(dir)['on-premise'];
  assert.equal(saved.environment, 'dev');
  assert.equal('password' in saved, false);
  assert.equal(fs.statSync(path.join(dir, 'targets.json')).mode & 0o777, 0o600);
});

test('keeps saved servers, most recently used first', async () => {
  const dir = tempDir();
  assert.deepEqual(listServers(dir), []);
  rememberServer(dir, { name: 'Lab NUC', url: 'http://10.0.0.5:8888/' });
  await later();
  rememberServer(dir, { name: 'Cloud dev', url: 'http://54.0.0.1:8888/' });
  assert.deepEqual(listServers(dir).map((server) => server.name), ['Cloud dev', 'Lab NUC']);

  await later();
  touchServer(dir, 'http://10.0.0.5:8888/');
  assert.deepEqual(listServers(dir).map((server) => server.name), ['Lab NUC', 'Cloud dev']);

  // Saving a known address again renames it instead of adding a duplicate.
  rememberServer(dir, { name: 'NUC 1', url: 'http://10.0.0.5:8888/' });
  assert.deepEqual(listServers(dir).map((server) => server.name), ['NUC 1', 'Cloud dev']);

  // Touching an unsaved address saves nothing.
  touchServer(dir, 'http://192.168.1.9/');
  assert.equal(listServers(dir).length, 2);

  forgetServer(dir, 'http://54.0.0.1:8888/');
  assert.deepEqual(listServers(dir).map((server) => server.url), ['http://10.0.0.5:8888/']);
  assert.deepEqual(Object.keys(listServers(dir)[0]).sort(), ['lastUsedUtc', 'name', 'url']);
});

test('ignores a damaged settings file', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'servers.json'), '{not json');
  fs.writeFileSync(path.join(dir, 'targets.json'), '[1, 2]');
  assert.deepEqual(listServers(dir), []);
  assert.deepEqual(loadTargetSettings(dir), {});
});
