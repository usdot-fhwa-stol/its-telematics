'use strict';

// The packaged app carries its own copy of deploy.py and the files it needs
// (deployment/ and telematic_system/, as tracked in git). The app's own files
// are read-only (the .deb installs them under /opt, owned by root),
// but deploy.py writes .env, secrets and Terraform state beside its scripts.
// So on startup the bundle is copied into a writable working copy, and each
// later version of the app refreshes it there.
//
// Only files the bundle lists are written or removed. Everything deploy.py
// generates (.env, secrets/*.txt, terraform.tfstate, .terraform/,
// terraform.tfvars.json) is not in the bundle, so it survives updates.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MANIFEST = 'manifest.json';
const INSTALLED_MANIFEST = '.bundle-manifest.json';

class BundleError extends Error {}

// Where the working copy lives: $XDG_DATA_HOME/telematics-deploy, by default
// ~/.local/share/telematics-deploy.
function defaultWorkingCopy(env = process.env) {
  const dataHome = env.XDG_DATA_HOME && path.isAbsolute(env.XDG_DATA_HOME)
    ? env.XDG_DATA_HOME
    : path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, 'telematics-deploy');
}

function readManifest(file) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new BundleError(`Could not read ${file}: ${error.message}`);
  }
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.files)) {
    throw new BundleError(`${file} is not a bundle manifest.`);
  }
  return manifest;
}

// A manifest path must stay inside the directory it is joined to.
function safeJoin(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) {
    throw new BundleError(`Invalid path in bundle manifest: ${JSON.stringify(relative)}`);
  }
  const full = path.resolve(root, relative);
  if (!full.startsWith(root + path.sep)) {
    throw new BundleError(`Path outside the bundle in manifest: ${relative}`);
  }
  return full;
}

// Copies `source` (the bundle shipped in the app) into `target` unless
// `target` already holds that version. Returns { version, updated }.
function installBundle(source, target) {
  const sourceRoot = path.resolve(source);
  const targetRoot = path.resolve(target);
  const manifest = readManifest(path.join(sourceRoot, MANIFEST));
  if (!manifest) throw new BundleError(`The app's deployment files are missing (${sourceRoot}).`);

  const installedFile = path.join(targetRoot, INSTALLED_MANIFEST);
  let installed = null;
  try {
    installed = readManifest(installedFile);
  } catch {
    installed = null; // Unreadable: reinstall over it.
  }
  if (installed && installed.version === manifest.version) {
    return { version: manifest.version, updated: false };
  }

  fs.mkdirSync(targetRoot, { recursive: true, mode: 0o700 });
  for (const relative of manifest.files) {
    const from = safeJoin(sourceRoot, relative);
    const to = safeJoin(targetRoot, relative);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    // Write beside the old file, then rename, so a crash never leaves half a script.
    const temporary = `${to}.bundle-tmp`;
    fs.copyFileSync(from, temporary);
    // Keep the executable bit, and make the copy writable by its owner only.
    fs.chmodSync(temporary, (fs.statSync(from).mode & 0o755) | 0o600);
    fs.renameSync(temporary, to);
  }

  // Files an earlier version shipped and this one dropped.
  const current = new Set(manifest.files);
  for (const relative of installed ? installed.files : []) {
    if (current.has(relative)) continue;
    let stale;
    try {
      stale = safeJoin(targetRoot, relative);
    } catch {
      continue;
    }
    fs.rmSync(stale, { force: true });
  }

  fs.writeFileSync(installedFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return { version: manifest.version, updated: true };
}

module.exports = { BundleError, MANIFEST, INSTALLED_MANIFEST, defaultWorkingCopy, installBundle };
