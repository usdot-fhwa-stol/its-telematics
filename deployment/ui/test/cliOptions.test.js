'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const fs = require('node:fs');
const { TOPOLOGIES } = require('../electron/cliOptions');

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
