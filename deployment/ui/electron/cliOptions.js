'use strict';

// Labels for the choices deployment/scripts/setup.py accepts. At startup the
// app reads the choices themselves from `setup.py --list-options`
// (electron/scriptOptions.js); these lists are used as they are only when the
// script cannot list them, for example an older setup.py.

const TARGETS = [
  { value: 'on-premise', label: 'on-premise: this machine or a host on your network' },
  { value: 'cloud', label: 'cloud: AWS (pipeline not built yet)' },
];

// Used instead of the cloud label above when setup.py lists the cloud options
// (--aws-region and --key-path).
const CLOUD_TARGET_LABEL = 'cloud: AWS';

// setup.py's --centralized and --distributed flags. The instance types are
// setup.py's CENTRALIZED_ROLES and DISTRIBUTED_ROLES; update them together.
const TOPOLOGIES = [
  { value: 'centralized', label: 'Centralized: one m5n.8xlarge node runs the UI, processing and database' },
  { value: 'distributed', label: 'Distributed: processing on m5n.8xlarge, UI on t2.2xlarge, database on t2.large' },
];

// How an on-premise deployment reaches its host. Maps to setup.py's
// `localhost` and `remote` targets.
const DEPLOY_TO = [
  { value: 'local', label: 'This machine', scriptTarget: 'localhost' },
  { value: 'remote', label: 'Remote machine', scriptTarget: 'remote' },
];

const ENVIRONMENTS = [
  { value: 'dev', label: 'dev' },
  { value: 'test', label: 'test' },
  { value: 'prod', label: 'prod' },
];

const USE_CASES = [
  { value: 'all', label: 'all services: core and rsu_integration' },
  { value: 'core', label: 'core services only: NATS, messaging server, databases, web app' },
  { value: 'rsu_integration', label: 'rsu_integration services only: RSU Management Service and InfluxDB v3' },
];

module.exports = { TARGETS, CLOUD_TARGET_LABEL, TOPOLOGIES, DEPLOY_TO, ENVIRONMENTS, USE_CASES };
