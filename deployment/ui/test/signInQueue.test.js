'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { MAX_FIELD_LENGTH, createSignInQueue } = require('../electron/signInQueue');

const grafana = { isProxy: false, scheme: 'basic', host: 'grafana.example.org', port: 443, realm: 'Grafana Login' };
const first = { url: 'https://grafana.example.org/grafana/dashboards', firstAuthAttempt: true };

function setup() {
  const shown = [];
  let idleCount = 0;
  const queue = createSignInQueue({ ask: (prompt) => shown.push(prompt), idle: () => { idleCount += 1; } });
  const answers = [];
  const callback = (label) => (...args) => answers.push([label, ...args]);
  return { queue, shown, answers, callback, idleCount: () => idleCount };
}

test('asks once per site and realm, and shares the answer', () => {
  const { queue, shown, answers, callback, idleCount } = setup();
  queue.add(first, grafana, callback('page'));
  queue.add({ ...first, url: 'https://grafana.example.org/grafana/public/app.js' }, grafana, callback('script'));
  assert.equal(shown.length, 1);
  assert.deepEqual(shown[0], {
    id: 1, site: 'https://grafana.example.org', realm: 'Grafana Login', isProxy: false, retry: false, unencrypted: false,
  });

  assert.equal(queue.answer(1, { username: 'alice', password: 'pw' }), true);
  assert.deepEqual(answers, [['page', 'alice', 'pw'], ['script', 'alice', 'pw']]);
  assert.equal(queue.pending(), 0);
  assert.equal(idleCount(), 1);
});

test('asks for other realms one at a time', () => {
  const { queue, shown, answers, callback } = setup();
  queue.add(first, grafana, callback('grafana'));
  queue.add({ url: 'http://10.0.0.5:8888/api', firstAuthAttempt: false },
    { ...grafana, host: '10.0.0.5', port: 8888, realm: 'Other' }, callback('other'));
  assert.equal(shown.length, 1);

  queue.answer(1, null);
  assert.deepEqual(answers, [['grafana']]);
  assert.equal(shown.length, 2);
  assert.equal(shown[1].site, 'http://10.0.0.5:8888');
  assert.equal(shown[1].retry, true);
  assert.equal(shown[1].unencrypted, true);
});

test('ignores stale ids and cancels malformed answers', () => {
  const { queue, answers, callback } = setup();
  queue.add(first, grafana, callback('page'));
  assert.equal(queue.answer(7, { username: 'a', password: 'b' }), false);
  assert.equal(queue.pending(), 1);

  assert.equal(queue.answer(1, { username: 'a', password: 'x'.repeat(MAX_FIELD_LENGTH + 1) }), false);
  assert.deepEqual(answers, [['page']]);
  assert.equal(queue.answer(1, { username: 'a', password: 'b' }), false);
});

test('names the proxy for proxy challenges', () => {
  const { queue, shown, callback } = setup();
  queue.add(first, { ...grafana, isProxy: true, host: 'proxy.corp', port: 3128 }, callback('page'));
  assert.equal(shown[0].site, 'proxy.corp:3128');
  assert.equal(shown[0].unencrypted, false);
});

test('cancels everything when the view closes', () => {
  const { queue, answers, callback, idleCount } = setup();
  queue.cancelAll();
  assert.equal(idleCount(), 0);
  queue.add(first, grafana, callback('a'));
  queue.add(first, { ...grafana, realm: 'Other' }, callback('b'));
  queue.cancelAll();
  assert.deepEqual(answers, [['a'], ['b']]);
  assert.equal(queue.pending(), 0);
  assert.equal(idleCount(), 1);
});
