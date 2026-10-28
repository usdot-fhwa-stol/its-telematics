'use strict';

// The Telematics view: a server's own web pages, shown below the app's strip.
// The pages are remote content, so the view is sandboxed and gets no preload:
// it cannot reach window.deployApi, start a deployment or read settings.

const { WebContentsView, session, shell } = require('electron');
const { isSameOrigin } = require('./serverConnection');

// Height of the app's strip above the view. Must match STRIP_HEIGHT in
// src/TelematicsStrip.jsx.
const STRIP_HEIGHT = 56;
// Persistent, so a signed-in session survives restarting the app, as in a browser.
const PARTITION = 'persist:telematics';
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write']);
const ERR_ABORTED = -3;

function openInBrowser(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

// Call once after the app is ready.
function configureTelematicsSession() {
  const telematicsSession = session.fromPartition(PARTITION);
  telematicsSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  telematicsSession.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
}

// onLoadFailed(message) runs when the server's page cannot be loaded.
// onLogin(details, authInfo, callback) runs for an HTTP authentication
// challenge from the page or its frames; callback() with no arguments cancels.
// onClosed() runs whenever the view closes.
function createTelematicsView(window, { onLoadFailed, onLogin, onClosed }) {
  let view = null;
  let serverUrl = null;

  const layout = () => {
    if (!view) return;
    const [width, height] = window.getContentSize();
    view.setBounds({ x: 0, y: STRIP_HEIGHT, width, height: Math.max(0, height - STRIP_HEIGHT) });
  };

  const close = () => {
    if (!view) return;
    const closing = view;
    view = null;
    serverUrl = null;
    // Cancels pending sign-ins while their requests still exist.
    onClosed();
    window.removeListener('resize', layout);
    window.contentView.removeChildView(closing);
    if (!closing.webContents.isDestroyed()) closing.webContents.close();
  };

  const open = (url) => {
    close();
    serverUrl = url;
    view = new WebContentsView({
      webPreferences: {
        partition: PARTITION,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    const contents = view.webContents;

    // The view stays on the chosen server; other sites open in the user's browser.
    const keepOnServer = (event, target) => {
      if (isSameOrigin(serverUrl, target)) return;
      event.preventDefault();
      openInBrowser(target);
    };
    contents.on('will-navigate', keepOnServer);
    contents.on('will-redirect', keepOnServer);
    contents.setWindowOpenHandler(({ url: target }) => {
      if (isSameOrigin(serverUrl, target)) contents.loadURL(target);
      else openInBrowser(target);
      return { action: 'deny' };
    });
    contents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => {
      if (!isMainFrame || code === ERR_ABORTED) return;
      close();
      onLoadFailed(`The server page could not be loaded (${description}).`);
    });
    contents.on('login', (event, details, authInfo, callback) => {
      event.preventDefault();
      onLogin(details, authInfo, callback);
    });

    window.contentView.addChildView(view);
    window.on('resize', layout);
    layout();
    contents.loadURL(url);
  };

  // Hidden while the app's sign-in dialog is shown, which the view would cover.
  const setVisible = (visible) => {
    if (view) view.setVisible(visible);
  };

  return { open, close, setVisible, isOpen: () => view !== null };
}

module.exports = { STRIP_HEIGHT, configureTelematicsSession, createTelematicsView };
