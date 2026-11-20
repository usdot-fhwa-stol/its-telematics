'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Labels for the choices deployment/scripts/deploy.py accepts. At startup the
// app reads the choices themselves from `deploy.py --list-options`
// (electron/scriptOptions.js); these lists are used as they are only when the
// script cannot list them, for example an older deploy.py.

// The form's "Deployment Mode".
const TARGETS = [
  { value: 'on-premise', label: 'This machine' },
  { value: 'cloud', label: 'Cloud (AWS), not available with this deploy.py' },
];

// Used instead of the cloud label above when deploy.py lists the cloud options
// (--aws-region and --key-path).
const CLOUD_TARGET_LABEL = 'Cloud (AWS)';

// deploy.py's --centralized and --distributed flags. Cloud runs always use
// DEPLOY_TOPOLOGY. `details` (shown before a cloud run) names the instance types
// from deploy.py's CENTRALIZED_ROLES and DISTRIBUTED_ROLES; update them together.
const TOPOLOGIES = [
  {
    value: 'centralized',
    label: 'Single Server',
    description: 'Runs all services on one large server.',
    details: 'One m5n.8xlarge instance runs the UI, processing and database.',
  },
  {
    value: 'distributed',
    label: 'Multiple Servers',
    description: 'Spreads services across three servers for better performance under heavy use.',
    details: 'Processing runs on an m5n.8xlarge, the UI on a t2.2xlarge and the database on a t2.large instance.',
  },
];

// deploy.py's target for on-premise: the app deploys only to the machine it runs on.
const ON_PREMISE_TARGET = 'localhost';

// deploy.py targets the app leaves out on purpose, so it does not offer them or
// mention them as missing. `remote` (another host over SSH) is out of scope for now.
const OMITTED_TARGETS = ['remote'];

// The environment a packaged app deploys, set when the .deb is built
// (scripts/stage-bundle.mjs records it in the bundle manifest): dev for develop
// builds, test for release candidates, prod for releases. prod when there is
// no bundle, for example under `npm run dev`.
const DEFAULT_DEPLOY_ENVIRONMENT = 'prod';
function builtEnvironment(resourcesPath = process.resourcesPath) {
  if (!resourcesPath) return DEFAULT_DEPLOY_ENVIRONMENT;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(resourcesPath, 'bundle', 'manifest.json'), 'utf8'));
    if (['dev', 'test', 'prod'].includes(manifest.deployEnvironment)) return manifest.deployEnvironment;
  } catch {
    // No bundle, or not readable: use the default.
  }
  return DEFAULT_DEPLOY_ENVIRONMENT;
}

// Choices the app makes for every run; the form does not offer them.
const DEPLOY_ENVIRONMENT = builtEnvironment();
const DEPLOY_USE_CASE = 'all'; // All Services: Core + RSU Management Services
const DEPLOY_TOPOLOGY = 'centralized'; // Single Server, for the cloud target

const ENVIRONMENTS = [
  { value: 'dev', label: 'dev' },
  { value: 'test', label: 'test' },
  { value: 'prod', label: 'prod' },
];

// deploy.py's --use-case choices. The app always sends DEPLOY_USE_CASE; these
// labels name the choices in messages.
const USE_CASES = [
  { value: 'core', label: 'Core Services' },
  { value: 'rsu_integration', label: 'RSU Management Services' },
  { value: 'all', label: 'All Services: Core + RSU Management Services' },
];

module.exports = {
  TARGETS, CLOUD_TARGET_LABEL, TOPOLOGIES, ON_PREMISE_TARGET, OMITTED_TARGETS,
  DEPLOY_ENVIRONMENT, DEPLOY_USE_CASE, DEPLOY_TOPOLOGY, ENVIRONMENTS, USE_CASES,
  builtEnvironment,
};
