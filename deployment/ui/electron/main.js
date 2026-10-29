'use strict';

const { app, BrowserWindow, dialog, ipcMain, net } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ValidationError, validateParams, buildArgs, formatCommand, runSetup } = require('./cliBridge');
const { loadScriptOptions } = require('./scriptOptions');
const {
  loadTargetSettings, saveTargetSettings, listServers, rememberServer, touchServer, forgetServer,
} = require('./settings');
const { ServerAddressError, normalizeServerUrl, checkServer } = require('./serverConnection');
const { configureTelematicsSession, createTelematicsView } = require('./telematicsView');
const { createSignInQueue } = require('./signInQueue');
const { AWS_PROFILE, CredentialsError, profileStatus, saveDefaultProfile } = require('./awsCredentials');

// The repository whose deployment/ tree the app runs. During development the
// app lives in <repo>/deployment/ui; TELEMATICS_REPO_ROOT points it elsewhere.
const REPO_ROOT = process.env.TELEMATICS_REPO_ROOT
  ? path.resolve(process.env.TELEMATICS_REPO_ROOT)
  : path.resolve(__dirname, '..', '..', '..');
const ASKPASS = path.join(__dirname, 'askpass.sh');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;
let telematicsView = null;
let activeRun = null;
let scriptOptions = null;

// The form's choices, read once from `setup.py --list-options`.
function getScriptOptions() {
  if (!scriptOptions) scriptOptions = loadScriptOptions({ repoRoot: REPO_ROOT });
  return scriptOptions;
}

// Sign-in prompts for the Telematics view. The renderer shows the dialog;
// a prompt of null closes it.
const signIn = createSignInQueue({
  ask: (prompt) => {
    if (telematicsView) telematicsView.setVisible(false);
    if (mainWindow) mainWindow.webContents.send('telematics:sign-in', prompt);
  },
  idle: () => {
    if (telematicsView) telematicsView.setVisible(true);
    if (mainWindow) mainWindow.webContents.send('telematics:sign-in', null);
  },
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#0f1218',
    title: 'Telematics Deploy',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  if (DEV_SERVER_URL) mainWindow.loadURL(DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  telematicsView = createTelematicsView(mainWindow, {
    onLoadFailed: (message) => {
      if (mainWindow) mainWindow.webContents.send('telematics:load-failed', message);
    },
    onLogin: signIn.add,
    onClosed: signIn.cancelAll,
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    telematicsView = null;
  });
}

// Only the app's own window may call these handlers.
function handle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      throw new Error('Rejected IPC call from an unknown sender.');
    }
    return handler(...args);
  });
}

function validationResult(error) {
  if (error instanceof ValidationError) return { validationErrors: error.errors };
  throw error;
}

// How setup.py prepares this machine for --target localhost: PR #336 replaces
// local.setup.sh with an Ansible playbook. The confirmation describes whichever
// this checkout has.
function hostPreparation() {
  const exists = (...parts) => fs.existsSync(path.join(REPO_ROOT, 'deployment', ...parts));
  if (exists('scripts', 'local.setup.sh')) return 'local.setup.sh';
  if (exists('config', 'ansible', 'playbooks', 'host_preparation.yml')) return 'ansible';
  return 'unknown';
}

handle('deploy:get-options', async () => ({
  options: await getScriptOptions(),
  hostPreparation: hostPreparation(),
  saved: loadTargetSettings(app.getPath('userData')),
  repoRoot: REPO_ROOT,
}));

handle('deploy:preview-command', async (params) => {
  const options = await getScriptOptions();
  try {
    return { command: formatCommand(buildArgs(validateParams(params, options))) };
  } catch (error) {
    return validationResult(error);
  }
});

handle('deploy:pick-key-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose SSH key',
    defaultPath: path.join(os.homedir(), '.ssh'),
    properties: ['openFile', 'showHiddenFiles'],
  });
  return canceled ? null : filePaths[0];
});

// The AWS default profile for the cloud target. The status never includes a
// key, and saved keys go only to the credentials file, never to setup.py.
async function awsProfileStatus(profile) {
  const { CLOUD } = await getScriptOptions();
  return profileStatus(process.env, {
    profile: typeof profile === 'string' && profile ? profile : AWS_PROFILE,
    namedProfiles: Boolean(CLOUD && CLOUD.namedProfiles),
  });
}

handle('aws:profile-status', awsProfileStatus);

handle('aws:save-profile', async (credentials) => {
  try {
    saveDefaultProfile(credentials);
    return { status: await awsProfileStatus(AWS_PROFILE) };
  } catch (error) {
    if (error instanceof CredentialsError) return { error: error.message };
    throw error;
  }
});

handle('deploy:launch', async (params, { remember } = {}) => {
  const options = await getScriptOptions();
  if (activeRun) return { validationErrors: ['A run is already in progress.'] };
  let valid;
  try {
    valid = validateParams(params, options);
  } catch (error) {
    return validationResult(error);
  }
  if (remember) saveTargetSettings(app.getPath('userData'), params);

  activeRun = runSetup(valid, {
    repoRoot: REPO_ROOT,
    askpassPath: valid.target === 'localhost' ? ASKPASS : undefined,
  });
  try {
    return await activeRun.done;
  } finally {
    activeRun = null;
  }
});

// Connect path: saved servers and the Telematics view.
handle('servers:list', () => listServers(app.getPath('userData')));

handle('servers:connect', async (address, { remember, name } = {}) => {
  let url;
  try {
    url = normalizeServerUrl(address);
  } catch (error) {
    if (error instanceof ServerAddressError) return { error: error.message };
    throw error;
  }
  const check = await checkServer(url, net.fetch);
  if (!check.ok) return { error: check.error };

  const userData = app.getPath('userData');
  if (remember) {
    const label = typeof name === 'string' ? name.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80) : '';
    rememberServer(userData, { name: label || new URL(url).host, url });
  } else {
    touchServer(userData, url);
  }
  telematicsView.open(check.url);
  return { url: check.url, servers: listServers(userData) };
});

handle('servers:forget', (url) => forgetServer(app.getPath('userData'), String(url)));

handle('servers:close-view', () => telematicsView.close());

handle('servers:answer-sign-in', (id, credentials) => signIn.answer(id, credentials));

app.whenReady().then(() => {
  configureTelematicsSession();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Closing the app stops the run; finished steps are not rolled back.
app.on('before-quit', () => {
  if (activeRun) activeRun.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
