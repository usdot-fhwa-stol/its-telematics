'use strict';

// The AWS profile that setup.py uses for the cloud target. setup.py accepts
// access keys on its command line, where any user can read them with ps, so
// the app never passes them. Instead it checks the shared AWS files the way
// setup.py does, and can add the default profile to the credentials file.
//
// setup.py from PR #336 reads only the default profile's access keys from the
// credentials file. With --aws-profile (namedProfiles), it also accepts any
// profile from the config file, including SSO and role profiles.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const AWS_PROFILE = 'default';
const ACCESS_KEYS = ['aws_access_key_id', 'aws_secret_access_key'];
// Config-file settings that supply credentials, as in setup.py's AWS_CONFIG_CREDENTIAL_SOURCES.
const CONFIG_SOURCES = [
  ['sso_session', 'sso'], ['sso_start_url', 'sso'], ['role_arn', 'role'],
  ['credential_process', 'process'], ['web_identity_token_file', 'role'],
];
const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_.+@-]{1,64}$/;
const KEY_ID_PATTERN = /^[A-Z0-9]{16,128}$/;
const SECRET_PATTERN = /^[A-Za-z0-9/+=]{16,128}$/;

class CredentialsError extends Error {}

function expandHome(file) {
  return file === '~' || file.startsWith('~/') ? path.join(os.homedir(), file.slice(1)) : file;
}

// Same lookup as setup.py: AWS_SHARED_CREDENTIALS_FILE, else ~/.aws/credentials.
function credentialsFile(env = process.env) {
  return path.resolve(expandHome(env.AWS_SHARED_CREDENTIALS_FILE || path.join(os.homedir(), '.aws', 'credentials')));
}

function configFile(env = process.env) {
  return path.resolve(expandHome(env.AWS_CONFIG_FILE || path.join(os.homedir(), '.aws', 'config')));
}

function displayPath(file) {
  const home = os.homedir();
  return file === home || file.startsWith(home + path.sep) ? `~${file.slice(home.length)}` : file;
}

// Section name => set of option names, read like Python's configparser:
// option names are lower-cased, values are never kept.
function readSections(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const sections = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const header = trimmed.match(/^\[(.+)\]$/);
    if (header) {
      current = header[1];
      if (!sections.has(current)) sections.set(current, new Set());
    } else if (current && /^\S/.test(line)) {
      const option = line.match(/^([^=:]+)[=:]/);
      if (option) sections.get(current).add(option[1].trim().toLowerCase());
    }
  }
  return sections;
}

const hasKeys = (options) => ACCESS_KEYS.every((key) => options.has(key));

// Every profile in the credentials and config files, with how it gets
// credentials (keys, sso, role, process), or kind null when setup.py's
// --aws-profile would reject it. Names only, never values.
function listProfiles(env = process.env) {
  const kinds = new Map();
  const add = (name, kind) => {
    if (!PROFILE_NAME_PATTERN.test(name)) return;
    if (!kinds.has(name) || (!kinds.get(name) && kind)) kinds.set(name, kind);
  };
  for (const [name, options] of readSections(credentialsFile(env)) || []) {
    add(name, hasKeys(options) ? 'keys' : null);
  }
  for (const [section, options] of readSections(configFile(env)) || []) {
    // setup.py reads the default profile from [default] only, as the AWS CLI does.
    const name = section === AWS_PROFILE ? section
      : section.startsWith('profile ') && section !== `profile ${AWS_PROFILE}` ? section.slice(8) : null;
    if (name === null) continue; // sso-session and services sections
    const source = CONFIG_SOURCES.find(([option]) => options.has(option));
    add(name, hasKeys(options) ? 'keys' : source ? source[1] : null);
  }
  return [...kinds]
    .map(([name, kind]) => ({ name, kind, ready: kind !== null }))
    .sort((a, b) => (a.name === AWS_PROFILE ? -1 : b.name === AWS_PROFILE ? 1 : a.name.localeCompare(b.name)));
}

// What the form shows about the chosen profile. Never includes a key.
function profileStatus(env = process.env, { profile = AWS_PROFILE, namedProfiles = false } = {}) {
  const file = credentialsFile(env);
  const config = readSections(configFile(env));
  const base = { profile, file: displayPath(file), configFile: displayPath(configFile(env)), namedProfiles };
  if (namedProfiles) {
    const profiles = listProfiles(env);
    const chosen = profiles.find((entry) => entry.name === profile);
    return {
      ...base,
      profiles,
      ready: Boolean(chosen && chosen.ready),
      kind: chosen ? chosen.kind : null,
      incomplete: Boolean(chosen) && !chosen.ready,
      inConfigFile: false,
    };
  }
  const options = (readSections(file) || new Map()).get(AWS_PROFILE);
  const ready = Boolean(options && hasKeys(options));
  return {
    ...base,
    profile: AWS_PROFILE,
    profiles: null,
    ready,
    kind: ready ? 'keys' : null,
    // A [default] section without both keys: setup.py would not use it, and the app won't edit it.
    incomplete: Boolean(options) && !ready,
    // A default profile set up with `aws configure sso` lives in the config file;
    // setup.py without --aws-profile does not look there.
    inConfigFile: Boolean(config && config.has(AWS_PROFILE)),
  };
}

// Adds the default profile to the credentials file, as setup.py would with
// --aws-access-key-id and --aws-secret-access-key. Refuses to change an
// existing default profile. Messages never include a key.
function saveDefaultProfile(credentials, env = process.env) {
  const accessKeyId = typeof credentials?.accessKeyId === 'string' ? credentials.accessKeyId.trim() : '';
  const secretAccessKey = typeof credentials?.secretAccessKey === 'string' ? credentials.secretAccessKey.trim() : '';
  const errors = [];
  if (!KEY_ID_PATTERN.test(accessKeyId)) errors.push('The access key ID should be 16 or more capital letters and digits.');
  if (!SECRET_PATTERN.test(secretAccessKey)) errors.push('The secret access key should be 16 or more letters, digits, /, + or =.');
  if (errors.length) throw new CredentialsError(errors.join(' '));

  const file = credentialsFile(env);
  const sections = readSections(file);
  if (sections && sections.has(AWS_PROFILE)) {
    throw new CredentialsError(`${displayPath(file)} already has a [${AWS_PROFILE}] profile. Edit it there, or with aws configure.`);
  }
  let existing = '';
  try {
    existing = fs.readFileSync(file, 'utf8');
  } catch {
    // No file yet.
  }
  const separator = existing && !existing.endsWith('\n') ? '\n\n' : existing ? '\n' : '';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.appendFileSync(file, `${separator}[${AWS_PROFILE}]\naws_access_key_id = ${accessKeyId}\n`
      + `aws_secret_access_key = ${secretAccessKey}\n`, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
  } catch {
    throw new CredentialsError(`Could not write ${displayPath(file)}; check its permissions.`);
  }
}

module.exports = {
  AWS_PROFILE, CredentialsError, credentialsFile, listProfiles, profileStatus, saveDefaultProfile,
};
