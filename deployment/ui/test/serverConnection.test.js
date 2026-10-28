'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const { normalizeServerUrl, isSameOrigin, checkServer } = require('../electron/serverConnection');

test('adds http:// to a bare address', () => {
  assert.equal(normalizeServerUrl(' 10.0.0.5:8888 '), 'http://10.0.0.5:8888/');
  assert.equal(normalizeServerUrl('local.cav-telematics.com:8888'), 'http://local.cav-telematics.com:8888/');
  assert.equal(normalizeServerUrl('https://telematics.example.org/app#top'), 'https://telematics.example.org/app');
});

test('rejects addresses the app cannot or should not open', () => {
  const message = (input) => {
    try {
      normalizeServerUrl(input);
    } catch (error) {
      return error.message;
    }
    return assert.fail(`accepted ${input}`);
  };
  assert.equal(message(''), 'Enter the server address.');
  assert.equal(message('10.0.0.5 8888'), 'The address must not contain spaces.');
  assert.equal(message('ftp://10.0.0.5'), 'Use an http:// or https:// address.');
  assert.equal(message('file:///etc/passwd'), 'Use an http:// or https:// address.');
  assert.equal(message('http://admin:secret@10.0.0.5'),
    'Remove the user name and password from the address, and sign in on the server page instead.');
  assert.equal(message('http://'), 'That is not a valid address.');
});

test('compares origins for the navigation rule', () => {
  assert.equal(isSameOrigin('http://10.0.0.5:8888/', 'http://10.0.0.5:8888/dashboard'), true);
  assert.equal(isSameOrigin('http://10.0.0.5:8888/', 'http://10.0.0.5:3000/'), false);
  assert.equal(isSameOrigin('http://10.0.0.5:8888/', 'https://10.0.0.5:8888/'), false);
  assert.equal(isSameOrigin('http://10.0.0.5:8888/', 'https://example.com/'), false);
  assert.equal(isSameOrigin('http://10.0.0.5:8888/', 'not a url'), false);
});

const reply = (status, url) => async () => ({ status, url, body: null });
const failWith = (message, name = 'TypeError') => async () => {
  const error = new Error(message);
  error.name = name;
  throw error;
};

test('accepts any reply below 500', async () => {
  assert.deepEqual(await checkServer('http://h/', reply(200, 'http://h/')), { ok: true, url: 'http://h/', status: 200 });
  assert.equal((await checkServer('http://h/', reply(401, 'http://h/'))).ok, true);
  assert.equal((await checkServer('http://h/', reply(404, 'http://h/'))).ok, true);
});

test('loads the final address after a redirect', async () => {
  const result = await checkServer('http://h/', reply(200, 'https://h/login'));
  assert.equal(result.url, 'https://h/login');
});

test('reports server errors and network failures in plain words', async () => {
  assert.equal((await checkServer('http://h/', reply(502, 'http://h/'))).error,
    'The server responded with HTTP 502. Its web UI may not be running.');
  assert.equal((await checkServer('http://h/', failWith('net::ERR_CONNECTION_REFUSED'))).error,
    'The connection was refused. Check the port and that the server is running.');
  assert.equal((await checkServer('http://h/', failWith('net::ERR_NAME_NOT_RESOLVED'))).error,
    'No server was found with that name.');
  assert.match((await checkServer('https://h/', failWith('net::ERR_CERT_AUTHORITY_INVALID'))).error,
    /self-signed/);
  assert.equal((await checkServer('http://h/', failWith('boom'))).error, 'Could not reach the server (boom).');
});

test('gives up after the timeout', async () => {
  const hang = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
  const result = await checkServer('http://h/', hang, { timeoutMs: 50 });
  assert.equal(result.error, 'The server did not respond within 0.05 seconds.');
});

test('checks a real HTTP server', async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<h1>Telematics</h1>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const result = await checkServer(url, fetch);
    assert.deepEqual(result, { ok: true, url, status: 200 });
  } finally {
    server.close();
  }
});
