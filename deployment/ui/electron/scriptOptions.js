'use strict';

// Reads the choices deploy.py accepts from `deploy.py --list-options` and turns
// them into the form's lists. Labels for known values come from cliOptions.js.
// An older deploy.py without --list-options gets the built-in lists instead.

const { execFile } = require('node:child_process');
const path = require('node:path');
const builtIn = require('./cliOptions');
const { DEPLOY_SCRIPT } = require('./cliBridge');

const LIST_TIMEOUT_MS = 10_000;
const MAX_LISTING_BYTES = 256 * 1024;

function listedOption(listing, name) {
  const option = listing.options.find((entry) => entry && entry.name === name);
  if (!option || !Array.isArray(option.choices) || !option.choices.every((choice) => typeof choice === 'string')) {
    throw new Error(`the listing has no choices for ${name}`);
  }
  return option;
}

function withLabels(choices, known, defaultValue) {
  return choices.map((value) => {
    const label = (known.find((option) => option.value === value) || { label: value }).label;
    return { value, label: value === defaultValue ? `${label} (default)` : label };
  });
}

// The services each use case starts, as display names in SERVICE_NAMES order.
function serviceNames(services) {
  return Object.keys(builtIn.SERVICE_NAMES)
    .filter((name) => services.includes(name))
    .map((name) => builtIn.SERVICE_NAMES[name]);
}

// "Desired Services": the use cases deploy.py lists, in the form's order, each
// with its description and services. A use case the app doesn't know shows by
// name, without a service list.
function useCaseOptions(choices) {
  const known = builtIn.USE_CASES.filter((option) => choices.includes(option.value));
  const unknown = choices.filter((value) => !known.some((option) => option.value === value));
  return [
    ...known.map(({ value, label, description, services }) => ({
      value, label, description, services: serviceNames(services),
    })),
    ...unknown.map((value) => ({ value, label: value, description: '', services: [] })),
  ];
}

// The cloud fields need deploy.py's cloud options; without them the
// form shows no cloud fields. Access keys are never offered: deploy.py
// takes them only on the command line, so the app uses the default profile.
function cloudOptions(byName) {
  const region = byName('--aws-region');
  if (!region || !byName('--key-path')) return null;
  const topologies = builtIn.TOPOLOGIES.filter((option) => byName(`--${option.value}`)).map((option) => option.value);
  const defaultTopology = topologies.includes('centralized') ? 'centralized' : topologies[0] || '';
  return {
    defaultRegion: typeof region.default === 'string' ? region.default : '',
    defaultTopology,
    TOPOLOGIES: builtIn.TOPOLOGIES.filter((option) => topologies.includes(option.value)),
    // The app always uses the default profile. With --aws-profile, deploy.py
    // also accepts it from the config file (SSO, role); without it, only access keys.
    namedProfiles: Boolean(byName('--aws-profile')),
  };
}

// Builds the form's lists from the parsed JSON, or throws if it is not the expected format.
function optionsFromListing(listing) {
  if (!listing || listing.schema_version !== 1 || !Array.isArray(listing.options)) {
    throw new Error('the listing is not in the expected format');
  }
  const environment = listedOption(listing, '--environment');
  const useCase = listedOption(listing, '--use-case');
  const target = listedOption(listing, '--target');

  // On-premise is deploy.py's localhost target.
  const byName = (name) => listing.options.find((entry) => entry && entry.name === name);
  const cloud = cloudOptions(byName);
  const targets = builtIn.TARGETS
    .filter((option) => target.choices.includes(option.value === 'on-premise' ? builtIn.ON_PREMISE_TARGET : option.value))
    .map((option) => (cloud && option.value === 'cloud' ? { ...option, label: builtIn.CLOUD_TARGET_LABEL } : option));
  const mapped = new Set([builtIn.ON_PREMISE_TARGET, 'cloud', ...builtIn.OMITTED_TARGETS]);
  const unmapped = target.choices.filter((value) => !mapped.has(value));

  // Secret overrides are offered only when the script can read them from
  // standard input; --secret-override alone would put them on the command line.
  const secretOption = byName('--secret-override');
  const secretKeys = byName('--secret-overrides-stdin') && secretOption && Array.isArray(secretOption.keys)
    ? secretOption.keys.filter((key) => typeof key === 'string')
    : [];

  return {
    TARGETS: targets,
    ENVIRONMENTS: withLabels(environment.choices, builtIn.ENVIRONMENTS, environment.default),
    USE_CASES: useCaseOptions(useCase.choices),
    SECRET_KEYS: secretKeys,
    CLOUD: cloud,
    // Whether a run removes the stack's Docker volumes (deploy.py's --volume-prune default).
    prunesVolumes: byName('--volume-prune')?.default === true,
    source: 'deploy.py',
    notice: unmapped.length
      ? `deploy.py also accepts --target ${unmapped.join(', ')}, which this app cannot configure yet.`
      : null,
  };
}

function describeFailure(error) {
  if (error.killed) return 'it did not answer within 10 seconds';
  if (typeof error.code === 'number') {
    // For example "AttributeError: module 'argparse' has no attribute ..." from a Python older than 3.9.
    const lastError = String(error.stderr || '').trim().split('\n').pop();
    return lastError ? `it exited with code ${error.code}: ${lastError}` : `it exited with code ${error.code}`;
  }
  if (error instanceof SyntaxError) return 'its output was not JSON';
  return error.message.split('\n')[0];
}

function runListOptions({ repoRoot, python }) {
  return new Promise((resolve, reject) => {
    execFile(python, [path.join(repoRoot, DEPLOY_SCRIPT), '--list-options'], {
      cwd: repoRoot, timeout: LIST_TIMEOUT_MS, maxBuffer: MAX_LISTING_BYTES,
    }, (error, stdout, stderr) => (error ? reject(Object.assign(error, { stderr })) : resolve(stdout)));
  });
}

// Never rejects: falls back to the built-in lists and says why in `notice`.
async function loadScriptOptions({ repoRoot, python = 'python3' }) {
  try {
    return optionsFromListing(JSON.parse(await runListOptions({ repoRoot, python })));
  } catch (error) {
    return {
      ...builtIn,
      USE_CASES: useCaseOptions(builtIn.USE_CASES.map((option) => option.value)),
      SECRET_KEYS: [],
      CLOUD: null,
      prunesVolumes: false,
      source: 'built-in',
      notice: `deploy.py could not list its options (${describeFailure(error)}), so the form uses the app's built-in list.`,
    };
  }
}

module.exports = { optionsFromListing, loadScriptOptions };
