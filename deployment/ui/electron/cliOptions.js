'use strict';

// Choices accepted by deployment/scripts/setup.py (its argparse `choices`).
// Keep these in step with setup.py until the CLI can list them itself
// (`deploy --options --output json` in the design).

const TARGETS = [
  { value: 'on-premise', label: 'on-premise: this machine or a host on your network' },
  { value: 'cloud', label: 'cloud: AWS (pipeline not built yet)' },
];

// How an on-premise deployment reaches its host. Maps to setup.py's
// `localhost` and `remote` targets.
const DEPLOY_TO = [
  { value: 'local', label: 'This machine', scriptTarget: 'localhost' },
  { value: 'remote', label: 'Remote host (SSH)', scriptTarget: 'remote' },
];

const ENVIRONMENTS = [
  { value: 'dev', label: 'dev' },
  { value: 'test', label: 'test' },
  { value: 'prod', label: 'prod' },
];

const USE_CASES = [
  { value: 'all', label: 'all: core and rsu_integration' },
  { value: 'core', label: 'core: NATS, messaging server, databases, web app' },
  { value: 'rsu_integration', label: 'rsu_integration: RSU Management Service and InfluxDB v3' },
];

module.exports = { TARGETS, DEPLOY_TO, ENVIRONMENTS, USE_CASES };
