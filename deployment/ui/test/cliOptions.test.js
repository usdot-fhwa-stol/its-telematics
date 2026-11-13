'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');
const fs = require('node:fs');
const { SERVICE_NAMES, TOPOLOGIES, USE_CASES } = require('../electron/cliOptions');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// The services Docker Compose starts for each use case: those with no profile,
// plus those whose profile is in the use case's COMPOSE_PROFILES. "all" uses
// both profiles (deployment/scripts/configuration_service.py).
const COMPOSE_SERVICES = `
import json, pathlib, sys, yaml
repo = pathlib.Path(sys.argv[1])
system = repo / "telematic_system"
services = {}
for name in (yaml.safe_load((system / "docker-compose.yml").read_text()) or {}).get("include", []):
    path = name if isinstance(name, str) else name["path"]
    for service, spec in ((yaml.safe_load((system / path).read_text()) or {}).get("services") or {}).items():
        services[service] = (spec or {}).get("profiles") or []
def profiles(use_case):
    for line in (repo / "deployment" / "use_cases" / use_case / ".env").read_text().splitlines():
        if line.startswith("COMPOSE_PROFILES="):
            return line.split("=", 1)[1].split(",")
    return []
cases = {"core": profiles("core"), "rsu_integration": profiles("rsu_integration")}
cases["all"] = ["messaging", "rsu_integration"]
print(json.dumps({
    case: sorted(s for s, p in services.items() if not p or set(p) & set(active))
    for case, active in cases.items()
}))
`;

function composeServices() {
  try {
    return JSON.parse(execFileSync('python3', ['-c', COMPOSE_SERVICES, REPO_ROOT], { encoding: 'utf8' }));
  } catch {
    return null; // No python3 or PyYAML here.
  }
}

test('each Desired Services option lists the services Docker Compose starts for it', (t) => {
  const expected = composeServices();
  if (!expected) {
    t.skip('needs python3 with PyYAML');
    return;
  }
  for (const useCase of USE_CASES) {
    assert.deepEqual([...useCase.services].sort(), expected[useCase.value], useCase.value);
  }
});

test('every listed service has a display name', () => {
  for (const useCase of USE_CASES) {
    for (const service of useCase.services) assert.ok(SERVICE_NAMES[service], service);
  }
});

test('the Server Setup details name the instance types deploy.py creates', () => {
  const script = fs.readFileSync(path.join(REPO_ROOT, 'deployment', 'scripts', 'deploy.py'), 'utf8');
  const roles = (name) => {
    const block = script.match(new RegExp(`^${name} = \\{([^}]*)\\}`, 'm'));
    assert.ok(block, `${name} not found in deploy.py`);
    return [...block[1].matchAll(/"([a-z0-9]+\.[a-z0-9]+)"/g)].map((match) => match[1]);
  };
  const details = (value) => TOPOLOGIES.find((option) => option.value === value).details;
  for (const type of roles('CENTRALIZED_ROLES')) assert.ok(details('centralized').includes(type), type);
  for (const type of roles('DISTRIBUTED_ROLES')) assert.ok(details('distributed').includes(type), type);
  assert.equal(roles('DISTRIBUTED_ROLES').length, 3, 'Multiple Servers says three servers');
});
