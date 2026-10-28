'use strict';

// Sign-in prompts for HTTP authentication challenges from the Telematics view,
// such as the Basic auth that Apache puts in front of Grafana. Chromium
// cancels a challenge the app does not answer, which shows Apache's 401 page.
//
// The user answers one challenge at a time. Challenges for the same site and
// realm that arrive meanwhile (the page's other requests) share the answer.
// The app stores nothing: Chromium keeps accepted credentials in memory until
// the app quits, as a browser does.

const MAX_FIELD_LENGTH = 1024;

function challengeKey({ isProxy, host, port, realm }) {
  return JSON.stringify([Boolean(isProxy), host, port, realm]);
}

function describeSite(details, authInfo) {
  if (authInfo.isProxy) return `${authInfo.host}:${authInfo.port}`;
  try {
    return new URL(details.url).origin;
  } catch {
    return authInfo.host;
  }
}

function validCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') return null;
  const { username, password } = credentials;
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  if (username.length > MAX_FIELD_LENGTH || password.length > MAX_FIELD_LENGTH) return null;
  return { username, password };
}

// ask(prompt) shows a prompt to the user; idle() runs when none is waiting.
function createSignInQueue({ ask, idle }) {
  const waiting = []; // { key, prompt, callbacks }
  let nextId = 1;

  const showNext = () => {
    if (waiting.length) ask(waiting[0].prompt);
    else idle();
  };

  // details, authInfo and callback come from the webContents 'login' event.
  const add = (details, authInfo, callback) => {
    const key = challengeKey(authInfo);
    const existing = waiting.find((entry) => entry.key === key);
    if (existing) {
      existing.callbacks.push(callback);
      return;
    }
    const site = describeSite(details, authInfo);
    waiting.push({
      key,
      callbacks: [callback],
      prompt: {
        id: nextId++,
        site,
        realm: String(authInfo.realm || ''),
        isProxy: Boolean(authInfo.isProxy),
        retry: details.firstAuthAttempt === false,
      },
    });
    if (waiting.length === 1) showNext();
  };

  // Answers the prompt on screen. Credentials of null cancel the challenge.
  // Returns false for a stale id or malformed credentials (which also cancel).
  const answer = (id, credentials) => {
    if (!waiting.length || waiting[0].prompt.id !== id) return false;
    const { callbacks } = waiting.shift();
    const valid = validCredentials(credentials);
    for (const callback of callbacks) {
      if (valid) callback(valid.username, valid.password);
      else callback();
    }
    showNext();
    return valid !== null || credentials === null;
  };

  // Cancels every challenge, for example when the view closes.
  const cancelAll = () => {
    if (!waiting.length) return;
    for (const entry of waiting.splice(0)) {
      for (const callback of entry.callbacks) callback();
    }
    idle();
  };

  return { add, answer, cancelAll, pending: () => waiting.length };
}

module.exports = { MAX_FIELD_LENGTH, createSignInQueue };
