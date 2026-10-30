'use strict';

// Settings kept in the app's user data folder (~/.config/Telematics Deploy/
// on Linux). Neither file ever holds a secret or a Telematics login.
//   targets.json  "Remember for this target": last non-secret form values per target
//   servers.json  servers saved on the connect path: name and address only

const fs = require('node:fs');
const path = require('node:path');

const REMEMBERED_FIELDS = [
  'environment', 'useCase', 'deployTo', 'remoteIo', 'remoteUser', 'keyPath', 'awsRegion', 'awsProfile', 'topology',
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function loadTargetSettings(userDataDir) {
  const value = readJson(path.join(userDataDir, 'targets.json'), {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function saveTargetSettings(userDataDir, params) {
  const all = loadTargetSettings(userDataDir);
  const saved = {};
  for (const field of REMEMBERED_FIELDS) {
    if (typeof params[field] === 'string') saved[field] = params[field];
  }
  all[params.target] = { ...saved, savedUtc: new Date().toISOString() };
  writeJson(path.join(userDataDir, 'targets.json'), all);
}

// Saved servers, most recently used first.
function listServers(userDataDir) {
  const value = readJson(path.join(userDataDir, 'servers.json'), []);
  if (!Array.isArray(value)) return [];
  return value
    .filter((server) => server && typeof server.url === 'string' && typeof server.name === 'string')
    .sort((a, b) => String(b.lastUsedUtc).localeCompare(String(a.lastUsedUtc)));
}

function writeServers(userDataDir, servers) {
  writeJson(path.join(userDataDir, 'servers.json'), servers);
}

// Adds the server, or updates its name and last-used time if it is saved.
function rememberServer(userDataDir, { name, url }) {
  const servers = listServers(userDataDir).filter((server) => server.url !== url);
  servers.unshift({ name, url, lastUsedUtc: new Date().toISOString() });
  writeServers(userDataDir, servers);
  return servers;
}

// Updates the last-used time of a saved server; does nothing for others.
function touchServer(userDataDir, url) {
  const servers = listServers(userDataDir);
  const server = servers.find((entry) => entry.url === url);
  if (!server) return servers;
  return rememberServer(userDataDir, { name: server.name, url });
}

function forgetServer(userDataDir, url) {
  const servers = listServers(userDataDir).filter((server) => server.url !== url);
  writeServers(userDataDir, servers);
  return servers;
}

module.exports = {
  REMEMBERED_FIELDS,
  loadTargetSettings,
  saveTargetSettings,
  listServers,
  rememberServer,
  touchServer,
  forgetServer,
};
