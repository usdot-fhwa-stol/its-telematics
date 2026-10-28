'use strict';

// Labels for the choices deployment/scripts/setup.py accepts. At startup the
// app reads the choices themselves from `setup.py --list-options`
// (electron/scriptOptions.js); these lists are used as they are only when the
// script cannot list them, for example an older setup.py.

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
