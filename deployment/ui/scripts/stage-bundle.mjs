// Copies the files deploy.py needs into build/bundle, which electron-builder
// ships as resources/bundle (see electron/bundle.js for how the app installs it).
//
// The bundle is what a fresh checkout would hold: the files git tracks under
// deployment/ (except this app) and telematic_system/. Untracked and ignored
// files (.env, secrets, Terraform state and provider caches) are left out.
// Tracked files are copied as they are in the working tree, so uncommitted
// edits are included; the manifest records whether there were any.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(uiDir, '..', '..');
const outDir = path.join(uiDir, 'build', 'bundle');
const INCLUDE = ['deployment', 'telematic_system'];
const EXCLUDE = ['deployment/ui/'];

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

const files = git('ls-files', '-z', '--', ...INCLUDE)
  .split('\0')
  .filter((file) => file && !EXCLUDE.some((prefix) => file.startsWith(prefix)))
  // Deleted in the working tree but not yet in git.
  .filter((file) => fs.existsSync(path.join(repoRoot, file)))
  .sort();
if (!files.includes('deployment/scripts/deploy.py')) {
  throw new Error('deployment/scripts/deploy.py is not tracked; nothing to bundle.');
}

fs.rmSync(outDir, { recursive: true, force: true });
const hash = createHash('sha256');
for (const file of files) {
  const from = path.join(repoRoot, file);
  const to = path.join(outDir, file);
  const { mode } = fs.statSync(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  fs.chmodSync(to, mode & 0o755);
  hash.update(`${file}\0${mode & 0o111 ? 'x' : '-'}\0`);
  hash.update(fs.readFileSync(from));
}

const commit = git('rev-parse', '--short', 'HEAD').trim();
const dirty = git('status', '--porcelain', '--', ...INCLUDE, ...EXCLUDE.map((p) => `:!${p}`)).trim() !== '';
const manifest = {
  version: hash.digest('hex').slice(0, 16),
  commit,
  dirty,
  files,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Bundled ${files.length} files from ${commit}${dirty ? ' (with uncommitted changes)' : ''} into ${path.relative(uiDir, outDir)}`);
