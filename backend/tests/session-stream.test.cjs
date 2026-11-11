const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

test('all consoles receive HTTP fallback ticks, reject stale frames, and clean up on exit', async () => {
  const bundle = buildSync({ entryPoints: [path.resolve(__dirname, '../../frontend/src/infrastructure/api/api.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
  let now = 10000;
  let socket;
  let watchdog;
  let cleared = false;
  let requests = 0;
  const received = [];
  const module = { exports: {} };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    module, exports: module.exports, require, URL, AbortController,
    Date: { now: () => now },
    window: { location: { protocol: 'http:', host: 'localhost' } },
    WebSocket: class { constructor() { socket = this; } close() { this.closed = true; } },
    setInterval: callback => { watchdog = callback; return 1; },
    clearInterval: () => { cleared = true; }, setTimeout: () => 2, clearTimeout: () => {},
    fetch: async () => { requests++; return { ok: true, json: async () => ({ server_timestamp_ms: now, session_duration_seconds: now / 1000 }) }; },
  });
  const unsubscribe = module.exports.subscribeToSessionStream(data => received.push(data));
  // Flush the initial asynchronous HTTP snapshot.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(received.at(-1).session_duration_seconds, 10);
  now = 11000; await watchdog();
  assert.equal(received.at(-1).session_duration_seconds, 11);
  socket.onmessage({ data: JSON.stringify({ server_timestamp_ms: 9000, session_duration_seconds: 9 }) });
  assert.equal(received.at(-1).session_duration_seconds, 11);
  socket.onmessage({ data: JSON.stringify({ server_timestamp_ms: 12000, session_duration_seconds: 12 }) });
  const before = requests;
  now = 12000; await watchdog();
  assert.equal(requests, before, 'healthy stream suppresses polling');
  now = 15000; await watchdog();
  assert.equal(received.at(-1).session_duration_seconds, 15, 'silent stream resumes polling');
  unsubscribe();
  assert.equal(cleared, true);
  assert.equal(socket.closed, true);
  now = 16000; await watchdog();
  assert.equal(received.at(-1).session_duration_seconds, 15);
});
