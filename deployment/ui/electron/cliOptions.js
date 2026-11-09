'use strict';

// Labels for the choices deployment/scripts/deploy.py accepts. At startup the
// app reads the choices themselves from `deploy.py --list-options`
// (electron/scriptOptions.js); these lists are used as they are only when the
// script cannot list them, for example an older deploy.py.

const TARGETS = [
  { value: 'on-premise', label: 'on-premise: this machine' },
  { value: 'cloud', label: 'cloud: AWS (pipeline not built yet)' },
];

// Used instead of the cloud label above when deploy.py lists the cloud options
// (--aws-region and --key-path).
const CLOUD_TARGET_LABEL = 'cloud: AWS';

// deploy.py's --centralized and --distributed flags. The instance types are
// deploy.py's CENTRALIZED_ROLES and DISTRIBUTED_ROLES; update them together.
const TOPOLOGIES = [
  { value: 'centralized', label: 'Centralized: one m5n.8xlarge node runs the UI, processing and database' },
  { value: 'distributed', label: 'Distributed: processing on m5n.8xlarge, UI on t2.2xlarge, database on t2.large' },
];

// deploy.py's target for on-premise: the app deploys only to the machine it runs on.
const ON_PREMISE_TARGET = 'localhost';

// deploy.py targets the app leaves out on purpose, so it does not offer them or
// mention them as missing. `remote` (another host over SSH) is out of scope for now.
const OMITTED_TARGETS = ['remote'];

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

module.exports = {
  TARGETS, CLOUD_TARGET_LABEL, TOPOLOGIES, ON_PREMISE_TARGET, OMITTED_TARGETS, ENVIRONMENTS, USE_CASES,
};
