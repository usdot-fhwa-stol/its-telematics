'use strict';

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

// The form's "Server Setup": deploy.py's --centralized and --distributed flags.
// `details` (shown before a cloud run) names the instance types from deploy.py's
// CENTRALIZED_ROLES and DISTRIBUTED_ROLES; update them together.
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

// The app always deploys with --environment prod; the form does not offer a choice.
const DEPLOY_ENVIRONMENT = 'prod';

const ENVIRONMENTS = [
  { value: 'dev', label: 'dev' },
  { value: 'test', label: 'test' },
  { value: 'prod', label: 'prod' },
];

// Display names for the Docker Compose services in telematic_system/, in the
// order the form lists them.
const SERVICE_NAMES = {
  web_client: 'Web Client',
  web_server: 'Web Server',
  apache2: 'Apache',
  grafana: 'Grafana',
  nats: 'NATS',
  messaging_server: 'Messaging Server',
  rosbag2_processing_service: 'Historical Data Processing',
  mysqldb: 'MySQL',
  influxdb: 'InfluxDB v2',
  rsu_management_service: 'RSU Management Service',
  'influxdb3-core': 'InfluxDB v3',
};

// Services every use case starts: those without a Compose profile.
const BASE_SERVICES = [
  'web_client', 'web_server', 'apache2', 'grafana', 'nats', 'rosbag2_processing_service', 'mysqldb', 'influxdb',
];

// The form's "Desired Services": deploy.py's --use-case, and the services each
// one starts. COMPOSE_PROFILES in deployment/use_cases/<name>/.env picks the
// profiled services (test/cliOptions.test.js checks these against the compose files).
const USE_CASES = [
  {
    value: 'core',
    label: 'Core Services',
    description: 'All services needed to deploy the Telematics application in its base state.',
    services: [...BASE_SERVICES, 'messaging_server'],
  },
  {
    value: 'rsu_integration',
    label: 'RSU Management Services',
    description: 'Brings up the RSU Management Service, which allows the tool to collect data from RSU(s) and visualize it.',
    services: [...BASE_SERVICES, 'rsu_management_service', 'influxdb3-core'],
  },
  {
    value: 'all',
    label: 'All Services',
    description: 'Core Services together with the RSU Management Service.',
    services: [...BASE_SERVICES, 'messaging_server', 'rsu_management_service', 'influxdb3-core'],
  },
];

module.exports = {
  TARGETS, CLOUD_TARGET_LABEL, TOPOLOGIES, ON_PREMISE_TARGET, OMITTED_TARGETS,
  DEPLOY_ENVIRONMENT, ENVIRONMENTS, SERVICE_NAMES, USE_CASES,
};
