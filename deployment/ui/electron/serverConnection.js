'use strict';

// Connect path: validates a Telematics server address and checks that the
// server's web UI responds before the app opens it.

const CHECK_TIMEOUT_MS = 5000;

class ServerAddressError extends Error {}

// Accepts "10.0.0.5:8888" or a full http(s) URL; returns the URL to load.
function normalizeServerUrl(input) {
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) throw new ServerAddressError('Enter the server address.');
  if (/[\s\u0000-\u001f\u007f]/.test(text)) {
    throw new ServerAddressError('The address must not contain spaces.');
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ServerAddressError('That is not a valid address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ServerAddressError('Use an http:// or https:// address.');
  }
  if (url.username || url.password) {
    throw new ServerAddressError('Remove the user name and password from the address, and sign in on the server page instead.');
  }
  url.hash = '';
  return url.toString();
}

function isSameOrigin(allowedUrl, targetUrl) {
  try {
    return new URL(targetUrl).origin === new URL(allowedUrl).origin;
  } catch {
    return false;
  }
}

function describeNetworkError(error, timeoutMs) {
  const message = String((error && error.message) || error);
  if (error && error.name === 'AbortError') {
    return `The server did not respond within ${timeoutMs / 1000} seconds.`;
  }
  if (/ERR_CERT_|ERR_SSL_|certificate/i.test(message)) {
    return 'The server\'s HTTPS certificate is not trusted, for example because it is self-signed. Self-signed certificates are not supported yet.';
  }
  if (/ERR_NAME_NOT_RESOLVED/.test(message)) return 'No server was found with that name.';
  if (/ERR_CONNECTION_REFUSED/.test(message)) return 'The connection was refused. Check the port and that the server is running.';
  if (/ERR_(ADDRESS_UNREACHABLE|INTERNET_DISCONNECTED|NETWORK_|CONNECTION_TIMED_OUT)/.test(message)) {
    return 'The server cannot be reached from this machine. Check the network or VPN.';
  }
  return `Could not reach the server (${message}).`;
}

// Requests the address and reports whether the web UI answered. Any reply
// below 500 counts: a login page or an authentication challenge still means
// the server is there. `fetchImpl` is Electron's net.fetch in the app.
async function checkServer(url, fetchImpl, { timeoutMs = CHECK_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    if (response.body && typeof response.body.cancel === 'function') response.body.cancel().catch(() => {});
    if (response.status >= 500) {
      return { ok: false, error: `The server responded with HTTP ${response.status}. Its web UI may not be running.` };
    }
    // After a redirect (for example http to https), load the final address.
    return { ok: true, url: response.url || url, status: response.status };
  } catch (error) {
    return { ok: false, error: describeNetworkError(error, timeoutMs) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  CHECK_TIMEOUT_MS,
  ServerAddressError,
  normalizeServerUrl,
  isSameOrigin,
  checkServer,
};
