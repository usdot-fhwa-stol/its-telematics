'use strict';

// CLI_Bridge: turns the form's params into a setup.py command and runs it.
// The renderer is never trusted: every value is checked here before a
// process starts, and the script is spawned without a shell.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { TARGETS, DEPLOY_TO, ENVIRONMENTS, USE_CASES } = require('./cliOptions');

const SETUP_SCRIPT = path.join('deployment', 'scripts', 'setup.py');
const MAX_OUTPUT_CHARS = 1_000_000;
const MAX_TEXT_LENGTH = 255;

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

// Returns the values setup.py needs, or throws ValidationError listing every problem.
function validateParams(params) {
  const input = params && typeof params === 'object' ? params : {};
  const errors = [];

  if (!findOption(TARGETS, input.target)) errors.push('Choose a target.');
  if (!findOption(ENVIRONMENTS, input.environment)) errors.push('Choose an environment.');
  if (!findOption(USE_CASES, input.useCase)) errors.push('Choose a use case.');

  let scriptTarget = 'cloud';
  const valid = {};
  if (input.target === 'on-premise') {
    const deployTo = findOption(DEPLOY_TO, input.deployTo);
    if (!deployTo) {
      errors.push('Choose where to deploy.');
    } else {
      scriptTarget = deployTo.scriptTarget;
    }
    if (input.deployTo === 'remote') {
      valid.remoteIo = checkText(input.remoteIo, 'Host address', errors);
      valid.remoteUser = checkText(input.remoteUser, 'SSH user', errors);
      if (input.keyPath) {
        const keyPath = String(input.keyPath);
        if (!path.isAbsolute(keyPath)) {
          errors.push('SSH key must be an absolute path.');
        } else {
          try {
            fs.accessSync(keyPath, fs.constants.R_OK);
            if (!fs.statSync(keyPath).isFile()) errors.push('SSH key must be a file.');
            else valid.keyPath = keyPath;
          } catch {
            errors.push('SSH key file does not exist or is not readable.');
          }
        }
      }
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return {
    environment: input.environment,
    target: scriptTarget,
    useCase: input.useCase,
    ...valid,
  };
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
  if (valid.target === 'remote') {
    args.push(`--remote-io=${valid.remoteIo}`, `--remote-user=${valid.remoteUser}`);
    if (valid.keyPath) args.push(`--key-path=${valid.keyPath}`);
  }
  return args;
}

function shellQuote(arg) {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

// Display only: the command as a user would type it from the repository root.
function formatCommand(args) {
  return ['./' + SETUP_SCRIPT.split(path.sep).join('/'), ...args].map(shellQuote).join(' ');
}

// Picks the known markers out of setup.py and configuration_service.py output.
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
  };
  for (const { text } of lines) {
    let match;
    if ((match = text.match(/^(.+?): (PASS|FAIL)$/))) {
      summary.checks.push({ name: match[1], status: match[2] });
    } else if ((match = text.match(/^Configured (\S+) from (.+)\.$/))) {
      summary.configuredSecrets.push({ key: match[1], source: match[2] });
    } else if ((match = text.match(/^Generated runtime configuration: (.+)$/))) {
      summary.generatedEnv = match[1];
    } else if ((match = text.match(/^Deployment failed at step: (.+)$/))) {
      summary.failedStep = match[1];
    } else if ((match = text.match(/^Exit code: (-?\d+)$/))) {
      summary.reportedExitCode = Number(match[1]);
    } else if ((match = text.match(/^Hint: (.+)$/))) {
      summary.hint = match[1];
    } else if ((match = text.match(/^error: (.+)$/))) {
      summary.errors.push(match[1]);
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

// Starts setup.py. Returns the child process, a promise for the result, and
// stop() to end the run.
function runSetup(valid, { repoRoot, python = 'python3', askpassPath, env = process.env }) {
  const args = buildArgs(valid);
  const childEnv = { ...env, PYTHONUNBUFFERED: '1' };
  // sudo has no terminal here, so it asks through this graphical helper.
  if (askpassPath) childEnv.SUDO_ASKPASS = askpassPath;

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
  // on, and sudo prompts there instead of opening the askpass dialog. It also
  // makes the script the leader of a process group that stop() can end.
  const child = spawn(python, [path.join(repoRoot, SETUP_SCRIPT), ...args], {
    cwd: repoRoot,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  // Ends setup.py and everything it started (sudo, local.setup.sh).
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
      parts.forEach((text) => addLine(stream, text));
    });
  }

  const done = new Promise((resolve) => {
    const finish = (exitCode, signal, spawnError) => {
      for (const stream of ['stdout', 'stderr']) {
        if (pending[stream]) addLine(stream, pending[stream]);
        pending[stream] = '';
      }
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
        summary: parseOutput(lines),
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
  SETUP_SCRIPT,
  ValidationError,
  validateParams,
  buildArgs,
  formatCommand,
  parseOutput,
  runSetup,
};
