'use strict';

// CLI_Bridge: turns the form's params into a deploy.py command and runs it.
// The renderer is never trusted: every value is checked here before a
// process starts, and the script is spawned without a shell.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const builtInOptions = require('./cliOptions');

const { ON_PREMISE_TARGET } = builtInOptions;
const { AWS_PROFILE, profileStatus } = require('./awsCredentials');

const DEPLOY_SCRIPT = path.join('deployment', 'scripts', 'deploy.py');
const MAX_OUTPUT_CHARS = 1_000_000;
const MAX_TEXT_LENGTH = 255;
const MAX_SECRET_LENGTH = 4096;
const AWS_REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d{1,2}$/;

class ValidationError extends Error {
  constructor(errors) {
    super(errors.join(' '));
    this.errors = errors;
  }
}

function findOption(list, value) {
  return list.find((option) => option.value === value);
}

function checkText(value, label, errors) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    errors.push(`${label} is required.`);
  } else if (text.length > MAX_TEXT_LENGTH) {
    errors.push(`${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  } else if (/\s/.test(text) || /[\u0000-\u001f\u007f]/.test(text)) {
    errors.push(`${label} must not contain spaces or control characters.`);
  }
  return text;
}

function checkKeyPath(value, errors) {
  const keyPath = String(value);
  if (!path.isAbsolute(keyPath)) {
    errors.push('SSH key must be an absolute path.');
    return undefined;
  }
  try {
    fs.accessSync(keyPath, fs.constants.R_OK);
    if (fs.statSync(keyPath).isFile()) return keyPath;
    errors.push('SSH key must be a file.');
  } catch {
    errors.push('SSH key file does not exist or is not readable.');
  }
  return undefined;
}

// The cloud fields exist only when deploy.py lists its cloud options
// (options.CLOUD). AWS access keys are never among them: deploy.py reads the
// default profile from the shared credentials file instead.
function checkCloud(input, cloud, env, valid, errors) {
  const profile = input.awsProfile || AWS_PROFILE;
  if (cloud.namedProfiles) {
    const status = typeof profile === 'string' ? profileStatus(env, { profile, namedProfiles: true }) : null;
    if (status && status.ready) valid.awsProfile = profile;
    else if (status && status.incomplete) errors.push(`The ${profile} AWS profile has no credentials deploy.py can use.`);
    else if (profile === AWS_PROFILE) errors.push('Add AWS credentials for the default profile.');
    else errors.push('Choose an AWS profile.');
  } else if (!cloud.PROFILES.some((option) => option.value === profile)) {
    errors.push('Choose an AWS profile.');
  } else if (!profileStatus(env).ready) {
    errors.push('Add AWS credentials for the default profile.');
  }
  const errorCount = errors.length;
  const region = checkText(input.awsRegion, 'AWS region', errors);
  if (errors.length === errorCount) {
    if (AWS_REGION_PATTERN.test(region)) valid.awsRegion = region;
    else errors.push('AWS region must look like us-east-1.');
  }
  if (findOption(cloud.TOPOLOGIES, input.topology)) valid.topology = input.topology;
  else errors.push('Choose a topology.');
  if (input.keyPath) {
    const keyPath = checkKeyPath(input.keyPath, errors);
    if (keyPath) valid.keyPath = keyPath;
  } else {
    errors.push('Choose the SSH key for the instances.');
  }
}

// Returns the values deploy.py needs, or throws ValidationError listing every problem.
// `options` are the lists the form showed (see scriptOptions.js); `env` is
// where the AWS credentials file is looked up, as deploy.py does.
function validateParams(params, options = builtInOptions, { env = process.env } = {}) {
  const { TARGETS, ENVIRONMENTS, USE_CASES } = options;
  const input = params && typeof params === 'object' ? params : {};
  const errors = [];

  if (!findOption(TARGETS, input.target)) errors.push('Choose a target.');
  if (!findOption(ENVIRONMENTS, input.environment)) errors.push('Choose an environment.');
  if (!findOption(USE_CASES, input.useCase)) errors.push('Choose a use case.');

  // On-premise deploys to this machine only.
  const scriptTarget = input.target === 'on-premise' ? ON_PREMISE_TARGET : 'cloud';
  const valid = {};
  if (input.target === 'cloud' && options.CLOUD) {
    checkCloud(input, options.CLOUD, env, valid, errors);
  }

  const secretOverrides = checkSecretOverrides(input.secretOverrides, options.SECRET_KEYS || [], errors);
  if (Object.keys(secretOverrides).length) valid.secretOverrides = secretOverrides;
  // Only when the script lists --volume-prune, whose --no- form keeps the data.
  if (input.keepData === true && options.prunesVolumes) valid.keepData = true;

  if (errors.length) throw new ValidationError(errors);
  return {
    environment: input.environment,
    target: scriptTarget,
    useCase: input.useCase,
    ...valid,
  };
}

// Keeps the non-empty values. Messages name the key, never the value.
function checkSecretOverrides(overrides, secretKeys, errors) {
  const kept = {};
  if (!overrides || typeof overrides !== 'object') return kept;
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== 'string' || value === '') continue;
    if (!secretKeys.includes(key)) {
      errors.push(`deploy.py does not accept a secret override for ${key}.`);
    } else if (value.length > MAX_SECRET_LENGTH) {
      errors.push(`The ${key} override must be ${MAX_SECRET_LENGTH} characters or fewer.`);
    } else if (/[\u0000-\u001f\u007f]/.test(value)) {
      errors.push(`The ${key} override must not contain line breaks or control characters.`);
    } else {
      kept[key] = value;
    }
  }
  return kept;
}

// Enumerated values use the same "--flag value" form as the README examples.
// Free-text values use "--flag=value", so a value starting with "-" can't be
// read as another option.
function buildArgs(valid) {
  const args = [
    '--environment', valid.environment,
    '--target', valid.target,
    '--use-case', valid.useCase,
  ];
  // Only with deploy.py's cloud options. Never --aws-access-key-id or
  // --aws-secret-access-key: deploy.py reads the default profile instead.
  if (valid.target === 'cloud' && valid.awsRegion) {
    if (valid.awsProfile) args.push(`--aws-profile=${valid.awsProfile}`);
    args.push(`--aws-region=${valid.awsRegion}`, `--${valid.topology}`, `--key-path=${valid.keyPath}`);
  }
  // The values themselves go to the script's standard input (runDeploy).
  if (valid.secretOverrides) args.push('--secret-overrides-stdin');
  if (valid.keepData) args.push('--no-volume-prune');
  return args;
}

function shellQuote(arg) {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

// Display only: the command as a user would type it from the repository root.
function formatCommand(args) {
  return ['./' + DEPLOY_SCRIPT.split(path.sep).join('/'), ...args].map(shellQuote).join(' ');
}

// The pipeline prints "[3] Verify registry connectivity ..... OK". A step
// still running has no status yet; it is either the unfinished last line
// (`partial`) or a line cut short by the step's "    - " progress bullets.
const STEP_LINE = /^\[(\d+)\] (.+?)[ .]*(OK|FAILED)?$/;

const CLOUD_STAGES = [
  { name: 'Install Terraform', start: /^error: Terraform is not installed/, end: /^Terraform installation: OK$/ },
  { name: 'Plan AWS infrastructure', start: /^Generated Terraform variables: /, end: /^Proposed infrastructure changes:$/ },
  { name: 'Create AWS infrastructure', start: /^Applying the plan\.$/, end: /^Ansible inventory: / },
];
const RUN_FAILED = /^Deployment failed at step: /;

function parseSteps(lines, partial = '') {
  const texts = [...lines.map((line) => line.text), partial];
  const failed = texts.some((text) => RUN_FAILED.test(text));
  const stages = [];
  for (const stage of CLOUD_STAGES) {
    const start = texts.findIndex((text) => stage.start.test(text));
    if (start === -1) continue;
    const ended = texts.slice(start + 1).some((text) => stage.end.test(text));
    stages.push({ name: stage.name, status: ended ? 'OK' : failed ? 'FAILED' : 'running' });
  }
  const steps = new Map();
  for (const text of texts) {
    const match = text.match(STEP_LINE);
    if (match) steps.set(Number(match[1]), { name: match[2], status: match[3] || 'running' });
  }
  return [...stages, ...steps.values()];
}

// deploy.py's Ansible inventory: one "<address> role=\"…\" private_ip=\"…\" …"
// line per host and group. A centralized node is listed once per group.
function parseInventory(text) {
  const hosts = new Map();
  for (const line of text.split('\n')) {
    const match = line.match(/^(\S+)\s+(.*)$/);
    if (!match || match[1].startsWith('[') || hosts.has(match[1])) continue;
    const vars = Object.fromEntries([...match[2].matchAll(/(\w+)="([^"]*)"/g)].map((entry) => [entry[1], entry[2]]));
    hosts.set(match[1], { address: match[1], role: vars.role || '', privateIp: vars.private_ip || '' });
  }
  return [...hosts.values()];
}

// The EC2 instances of a cloud run, from the inventory it printed it wrote.
// An inventory from an earlier run is never read: the path must come from
// this run's output and lie inside the repository.
function readCloudInstances(summary, repoRoot) {
  if (!summary.inventoryPath) return [];
  const file = path.resolve(repoRoot, summary.inventoryPath);
  if (!file.startsWith(path.resolve(repoRoot) + path.sep)) return [];
  try {
    return parseInventory(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

// Picks the known markers out of deploy.py and configuration_service.py output.
function parseOutput(lines) {
  const summary = {
    checks: [],
    configuredSecrets: [],
    generatedEnv: null,
    failedStep: null,
    reportedExitCode: null,
    hint: null,
    errors: [],
    deploymentContext: null,
    manifestReference: null,
    // deploy.py's ExecutionSummary: overall_status, ui_url, active_services, diagnostics.
    execution: null,
    uiUrl: null,
    // Cloud runs: the inventory deploy.py wrote once the instances existed,
    // and what happened to them when provisioning failed.
    inventoryPath: null,
    sshCommand: null,
    rollback: null,
    rollbackCommand: null,
    steps: parseSteps(lines),
  };
  // deploy.py prints its ExecutionSummary as indented JSON, from "{" to "}".
  const blocks = { stdout: null, stderr: null };
  for (const { stream, text } of lines) {
    if (blocks[stream] !== null) {
      blocks[stream].push(text);
      if (text === '}') {
        try {
          const value = JSON.parse(blocks[stream].join('\n'));
          if (value && 'overall_status' in value) summary.execution = value;
        } catch {
          // Not JSON; leave it in the log only.
        }
        blocks[stream] = null;
      }
      continue;
    }
    if (text === '{') {
      blocks[stream] = [text];
      continue;
    }
    let match;
    if ((match = text.match(/^Open the UI: (https?:\/\/\S+)$/))) {
      summary.uiUrl = match[1];
    } else if ((match = text.match(/^(.+?): (PASS|FAIL)$/))) {
      summary.checks.push({ name: match[1], status: match[2] });
    } else if ((match = text.match(/^Configured (\S+) from (.+)\.$/))) {
      summary.configuredSecrets.push({ key: match[1], source: match[2] });
    } else if ((match = text.match(/^Generated runtime configuration: (.+)$/))) {
      summary.generatedEnv = match[1];
    } else if ((match = text.match(/^Ansible inventory: (.+)$/))) {
      summary.inventoryPath = match[1];
    } else if ((match = text.match(/^SSH debug connection: (ssh .+)$/))) {
      summary.sshCommand = match[1];
    } else if (text.startsWith('Rollback complete')) {
      summary.rollback = 'complete';
    } else if ((match = text.match(/^Rollback FAILED\. Remove leftovers manually: (.+)$/))) {
      summary.rollback = 'failed';
      summary.rollbackCommand = match[1];
    } else if (text.startsWith('Rollback could not run')) {
      summary.rollback = 'failed';
    // A failed stage is reported again by each stage around it, ending with
    // "Execute deployment pipeline"; the first report names the stage itself.
    } else if ((match = text.match(/^Deployment failed at step: (.+)$/))) {
      summary.failedStep = summary.failedStep || match[1];
    } else if ((match = text.match(/^Exit code: (-?\d+)$/))) {
      summary.reportedExitCode = summary.reportedExitCode ?? Number(match[1]);
    } else if ((match = text.match(/^Hint: (.+)$/))) {
      summary.hint = summary.hint || match[1];
    } else if ((match = text.match(/^error: (.+)$/))) {
      // "error: Terraform is not installed …; installing it now." is a notice.
      if (!match[1].endsWith('installing it now.')) summary.errors.push(match[1]);
    } else if (text.startsWith('{')) {
      try {
        const value = JSON.parse(text);
        if ('runtime_env_path' in value) summary.manifestReference = value;
        else if ('target' in value) summary.deploymentContext = value;
      } catch {
        // Not JSON; leave it in the log only.
      }
    }
  }
  return summary;
}

// Starts deploy.py. Returns the child process, a promise for the result, and
// stop() to end the run. `extraEnv` adds variables such as the password
// helper's (sudoPassword.js). `onOutput` gets each chunk's new lines and the
// steps so far, while the run is going.
function runDeploy(valid, { repoRoot, python = 'python3', extraEnv = {}, env = process.env, onOutput }) {
  const args = buildArgs(valid);
  const childEnv = { ...env, ...extraEnv, PYTHONUNBUFFERED: '1' };

  const startedAt = new Date().toISOString();
  const lines = [];
  let outputChars = 0;
  let truncated = false;
  const pending = { stdout: '', stderr: '' };

  const addLine = (stream, text) => {
    if (truncated) return;
    outputChars += text.length;
    if (outputChars > MAX_OUTPUT_CHARS) {
      truncated = true;
      lines.push({ stream: 'stderr', text: '[output truncated]' });
      return;
    }
    lines.push({ stream, text });
  };

  // `detached` starts the script in its own session with no controlling
  // terminal. Without it, an app launched from a terminal passes that terminal
  // on, and sudo prompts there instead of running SUDO_ASKPASS. It also
  // makes the script the leader of a process group that stop() can end.
  const child = spawn(python, [path.join(repoRoot, DEPLOY_SCRIPT), ...args], {
    cwd: repoRoot,
    env: childEnv,
    stdio: [valid.secretOverrides ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    detached: true,
  });
  // Secret values never go on the command line or into the environment,
  // where other users or child processes could see them.
  if (valid.secretOverrides) {
    child.stdin.on('error', () => {}); // The script exited before reading.
    child.stdin.end(JSON.stringify(valid.secretOverrides));
  }

  // Ends deploy.py and everything it started (Ansible, Docker Compose).
  const stop = () => {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // The group has already exited.
    }
  };

  for (const stream of ['stdout', 'stderr']) {
    child[stream].setEncoding('utf8');
    child[stream].on('data', (chunk) => {
      const parts = (pending[stream] + chunk).split(/\r?\n/);
      pending[stream] = parts.pop();
      const before = lines.length;
      parts.forEach((text) => addLine(stream, text));
      if (onOutput) onOutput({ lines: lines.slice(before), steps: parseSteps(lines, pending.stdout) });
    });
  }

  const done = new Promise((resolve) => {
    const finish = (exitCode, signal, spawnError) => {
      for (const stream of ['stdout', 'stderr']) {
        if (pending[stream]) addLine(stream, pending[stream]);
        pending[stream] = '';
      }
      const summary = parseOutput(lines);
      resolve({
        ok: exitCode === 0,
        exitCode,
        signal,
        spawnError,
        command: formatCommand(args),
        target: valid.target,
        useCase: valid.useCase,
        startedAt,
        finishedAt: new Date().toISOString(),
        lines,
        summary,
        instances: valid.target === 'cloud' ? readCloudInstances(summary, repoRoot) : [],
        awsRegion: valid.awsRegion || null,
      });
    };
    child.on('error', (error) => {
      finish(null, null, error.code === 'ENOENT'
        ? `${python} was not found. Install Python 3 and try again.`
        : `Could not start ${python}: ${error.message}`);
    });
    child.on('close', (code, signal) => finish(code, signal, null));
  });

  return { child, done, stop };
}

module.exports = {
  DEPLOY_SCRIPT,
  ValidationError,
  validateParams,
  buildArgs,
  formatCommand,
  parseSteps,
  parseOutput,
  parseInventory,
  runDeploy,
};
