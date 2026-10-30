'use strict';

// Reads the choices setup.py accepts from `setup.py --list-options` and turns
// them into the form's lists. Labels for known values come from cliOptions.js.
// An older setup.py without --list-options gets the built-in lists instead.

const { execFile } = require('node:child_process');
const path = require('node:path');
const builtIn = require('./cliOptions');
const { SETUP_SCRIPT } = require('./cliBridge');
const { AWS_PROFILE } = require('./awsCredentials');

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

// The cloud fields need setup.py's cloud options; without them the
// form shows no cloud fields. Access keys are never offered: setup.py
// takes them only on the command line, so the app uses the default profile.
function cloudOptions(byName) {
  const region = byName('--aws-region');
  if (!region || !byName('--key-path')) return null;
  const topologies = builtIn.TOPOLOGIES.filter((option) => byName(`--${option.value}`)).map((option) => option.value);
  const defaultTopology = topologies.includes('centralized') ? 'centralized' : topologies[0] || '';
  return {
    defaultRegion: typeof region.default === 'string' ? region.default : '',
    defaultTopology,
    TOPOLOGIES: withLabels(topologies, builtIn.TOPOLOGIES, defaultTopology),
    // With --aws-profile the form lists the profiles in the AWS files
    // (awsCredentials.js); without it, setup.py uses only the default profile.
    namedProfiles: Boolean(byName('--aws-profile')),
    PROFILES: [{ value: AWS_PROFILE, label: AWS_PROFILE }],
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

  // The form groups setup.py's localhost and remote targets under on-premise.
  const deployTo = builtIn.DEPLOY_TO.filter((option) => target.choices.includes(option.scriptTarget));
  const byName = (name) => listing.options.find((entry) => entry && entry.name === name);
  const cloud = cloudOptions(byName);
  const targets = builtIn.TARGETS
    .filter((option) => (
      option.value === 'on-premise' ? deployTo.length > 0 : target.choices.includes(option.value)
    ))
    .map((option) => (cloud && option.value === 'cloud' ? { ...option, label: builtIn.CLOUD_TARGET_LABEL } : option));
  const mapped = new Set([...builtIn.DEPLOY_TO.map((option) => option.scriptTarget), 'cloud']);
  const unmapped = target.choices.filter((value) => !mapped.has(value));

  // Secret overrides are offered only when the script can read them from
  // standard input; --secret-override alone would put them on the command line.
  const secretOption = byName('--secret-override');
  const secretKeys = byName('--secret-overrides-stdin') && secretOption && Array.isArray(secretOption.keys)
    ? secretOption.keys.filter((key) => typeof key === 'string')
    : [];

  return {
    TARGETS: targets,
    DEPLOY_TO: deployTo,
    ENVIRONMENTS: withLabels(environment.choices, builtIn.ENVIRONMENTS, environment.default),
    USE_CASES: withLabels(useCase.choices, builtIn.USE_CASES, useCase.default),
    SECRET_KEYS: secretKeys,
    CLOUD: cloud,
    // Whether a run removes the stack's Docker volumes (setup.py's --volume-prune default).
    prunesVolumes: byName('--volume-prune')?.default === true,
    source: 'setup.py',
    notice: unmapped.length
      ? `setup.py also accepts --target ${unmapped.join(', ')}, which this app cannot configure yet.`
      : null,
  };
}

function describeFailure(error) {
  if (error.killed) return 'it did not answer within 10 seconds';
  if (typeof error.code === 'number') return `it exited with code ${error.code}`;
  if (error instanceof SyntaxError) return 'its output was not JSON';
  return error.message.split('\n')[0];
}

function runListOptions({ repoRoot, python }) {
  return new Promise((resolve, reject) => {
    execFile(python, [path.join(repoRoot, SETUP_SCRIPT), '--list-options'], {
      cwd: repoRoot, timeout: LIST_TIMEOUT_MS, maxBuffer: MAX_LISTING_BYTES,
    }, (error, stdout) => (error ? reject(error) : resolve(stdout)));
  });
}

// Never rejects: falls back to the built-in lists and says why in `notice`.
async function loadScriptOptions({ repoRoot, python = 'python3' }) {
  try {
    return optionsFromListing(JSON.parse(await runListOptions({ repoRoot, python })));
  } catch (error) {
    return {
      ...builtIn,
      SECRET_KEYS: [],
      CLOUD: null,
      prunesVolumes: false,
      source: 'built-in',
      notice: `setup.py could not list its options (${describeFailure(error)}), so the form uses the app's built-in list.`,
    };
  }
}

module.exports = { optionsFromListing, loadScriptOptions };
