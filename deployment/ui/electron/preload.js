'use strict';

// The only API the renderer gets. It has no Node access of its own.
// The Telematics view (remote server pages) gets no preload at all.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deployApi', {
  getOptions: () => ipcRenderer.invoke('deploy:get-options'),
  previewCommand: (params) => ipcRenderer.invoke('deploy:preview-command', params),
  pickKeyFile: () => ipcRenderer.invoke('deploy:pick-key-file'),
  launch: (params, launchOptions) => ipcRenderer.invoke('deploy:launch', params, launchOptions),
  awsProfileStatus: (profile) => ipcRenderer.invoke('aws:profile-status', profile),
  // credentials: { accessKeyId, secretAccessKey }. Written to the AWS credentials file only.
  saveAwsProfile: (credentials) => ipcRenderer.invoke('aws:save-profile', credentials),

  listServers: () => ipcRenderer.invoke('servers:list'),
  connect: (address, connectOptions) => ipcRenderer.invoke('servers:connect', address, connectOptions),
  forgetServer: (url) => ipcRenderer.invoke('servers:forget', url),
  closeTelematicsView: () => ipcRenderer.invoke('servers:close-view'),
  // credentials: { username, password }, or null to cancel.
  answerSignIn: (id, credentials) => ipcRenderer.invoke('servers:answer-sign-in', id, credentials),
  // Returns a function that removes the listener. A prompt of null closes the dialog.
  onTelematicsSignIn: (callback) => {
    const listener = (_event, prompt) => callback(prompt);
    ipcRenderer.on('telematics:sign-in', listener);
    return () => ipcRenderer.removeListener('telematics:sign-in', listener);
  },
  // Returns a function that removes the listener.
  onTelematicsLoadFailed: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('telematics:load-failed', listener);
    return () => ipcRenderer.removeListener('telematics:load-failed', listener);
  },
});
