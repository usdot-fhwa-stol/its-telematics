'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  CredentialsError, credentialsFile, listProfiles, profileStatus, saveDefaultProfile,
} = require('../electron/awsCredentials');

const KEY_ID = 'AKIAEXAMPLEKEYID0001';
const SECRET = 'wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY';

function awsDir({ credentials, config } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-ui-aws-'));
  const env = { AWS_SHARED_CREDENTIALS_FILE: path.join(dir, 'credentials'), AWS_CONFIG_FILE: path.join(dir, 'config') };
  if (credentials !== undefined) fs.writeFileSync(env.AWS_SHARED_CREDENTIALS_FILE, credentials, { mode: 0o644 });
  if (config !== undefined) fs.writeFileSync(env.AWS_CONFIG_FILE, config);
  return env;
}

test('finds the credentials file the way setup.py does', () => {
  assert.equal(credentialsFile({}), path.join(os.homedir(), '.aws', 'credentials'));
  assert.equal(credentialsFile({ AWS_SHARED_CREDENTIALS_FILE: '~/keys/aws' }), path.join(os.homedir(), 'keys', 'aws'));
});

test('reports whether the default profile has access keys, without the keys', () => {
  const ready = profileStatus(awsDir({
    credentials: `# keys\n[work]\naws_access_key_id = X\n\n[default]\nAWS_Access_Key_ID=${KEY_ID}\naws_secret_access_key: ${SECRET}\n`,
  }));
  assert.equal(ready.ready, true);
  assert.equal(ready.profile, 'default');
  assert.equal(JSON.stringify(ready).includes(SECRET), false);

  const incomplete = profileStatus(awsDir({ credentials: `[default]\naws_access_key_id = ${KEY_ID}\n` }));
  assert.deepEqual([incomplete.ready, incomplete.incomplete], [false, true]);

  // `aws configure sso` writes the default profile to the config file, which setup.py does not read.
  const sso = profileStatus(awsDir({ config: '[default]\nsso_session = lab\n' }));
  assert.deepEqual([sso.ready, sso.incomplete, sso.inConfigFile], [false, false, true]);
});

test('adds the default profile, readable only by the user, and keeps the rest of the file', () => {
  const env = awsDir({ credentials: '[work]\naws_access_key_id = WORKKEYID00000001\naws_secret_access_key = work' });
  saveDefaultProfile({ accessKeyId: ` ${KEY_ID} `, secretAccessKey: SECRET }, env);
  assert.equal(profileStatus(env).ready, true);
  const text = fs.readFileSync(env.AWS_SHARED_CREDENTIALS_FILE, 'utf8');
  assert.ok(text.startsWith('[work]\naws_access_key_id = WORKKEYID00000001\naws_secret_access_key = work\n\n[default]\n'));
  assert.ok(text.includes(`aws_access_key_id = ${KEY_ID}\naws_secret_access_key = ${SECRET}\n`));
  assert.equal(fs.statSync(env.AWS_SHARED_CREDENTIALS_FILE).mode & 0o777, 0o600);

  const fresh = awsDir();
  saveDefaultProfile({ accessKeyId: KEY_ID, secretAccessKey: SECRET }, fresh);
  assert.equal(fs.readFileSync(fresh.AWS_SHARED_CREDENTIALS_FILE, 'utf8').split('\n')[0], '[default]');
});

test('never changes an existing default profile, and never echoes a key', () => {
  const env = awsDir({ credentials: '[default]\nregion = us-east-1\n' });
  const before = fs.readFileSync(env.AWS_SHARED_CREDENTIALS_FILE, 'utf8');
  assert.throws(() => saveDefaultProfile({ accessKeyId: KEY_ID, secretAccessKey: SECRET }, env),
    (error) => error instanceof CredentialsError && /already has a \[default\] profile/.test(error.message));
  assert.equal(fs.readFileSync(env.AWS_SHARED_CREDENTIALS_FILE, 'utf8'), before);

  assert.throws(() => saveDefaultProfile({ accessKeyId: 'not a key', secretAccessKey: 'bad\nsecret value' }, awsDir()),
    (error) => /access key ID/.test(error.message) && /secret access key/.test(error.message)
      && !error.message.includes('bad') && !error.message.includes('not a key'));
});

const NAMED = {
  credentials: `[keys]\naws_access_key_id = ${KEY_ID}\naws_secret_access_key = ${SECRET}\n[partial]\naws_access_key_id = ${KEY_ID}\n`,
  config: '[default]\nsso_session = lab\nsso_account_id = 1\n[profile role]\nrole_arn = arn:aws:iam::1:role/x\n'
    + '[profile regiononly]\nregion = us-east-1\n[profile default]\nregion = x\n[sso-session lab]\nsso_start_url = https://x\n'
    + '[profile partial]\ncredential_process = /bin/creds\n',
};

test('lists the profiles setup.py --aws-profile accepts, default first', () => {
  assert.deepEqual(listProfiles(awsDir(NAMED)), [
    { name: 'default', kind: 'sso', ready: true },
    { name: 'keys', kind: 'keys', ready: true },
    { name: 'partial', kind: 'process', ready: true },
    { name: 'regiononly', kind: null, ready: false },
    { name: 'role', kind: 'role', ready: true },
  ]);
});

test('accepts an SSO default profile only when setup.py takes --aws-profile', () => {
  const env = awsDir(NAMED);
  assert.equal(profileStatus(env).ready, false);
  const named = profileStatus(env, { profile: 'default', namedProfiles: true });
  assert.deepEqual([named.ready, named.kind, named.profiles.length], [true, 'sso', 5]);
  assert.equal(profileStatus(env, { profile: 'regiononly', namedProfiles: true }).incomplete, true);
  assert.equal(profileStatus(env, { profile: 'lab', namedProfiles: true }).ready, false);
});
