const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

test('telemetry resolves database arrays before REST/stream serialization', async () => {
  // Bundle with isolated dependencies so this regression never touches a database.
  const mocks = {
    './session.service': 'export const sessionService = { getConfig: () => ({}), getScheduledSession: () => null };',
    './member.service': 'export const memberService = { getCachedAll: () => [] };',
    './ai.service': `export const aiService = {
      analyzeSpeechRelevance: () => ({ score: 1, matched: [] }),
      analyzeEmotion: () => ({ label: 'Neutral', confidence: 1 }),
      analyzeOffensive: () => ({ isOffensive: false, flaggedWords: [] }),
      generateLiveSummary: () => ({})
    };`,
    '../repositories/alert.repository': `export const alertRepository = {
      getCachedAlerts: () => [],
      getPendingRecommendations: async () => [{ alert_id: 'recommendation-1' }]
    };`,
    '../repositories/transcript.repository': 'export const transcriptRepository = { getCachedRecent: () => [] };',
    '../repositories/emergency.repository': 'export const emergencyRepository = { findAll: async () => [{ id: "emergency-1" }] };',
    '../repositories/notification.repository': 'export const notificationRepository = { getAll: async () => [{ id: "notification-1" }] };',
    '../config': 'export const rulesConfig = {}; export const DATA_DIR = ""; export const RUNTIME_STATE_PATH = "";'
  };
  const result = await build({
    entryPoints: [path.join(__dirname, '../services/telemetry.service.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    plugins: [{
      name: 'isolated-repositories',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, args =>
          mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path] }));
      }
    }]
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, require, console,
    setInterval: () => 1, clearInterval: () => {}
  });
  const service = module.exports.telemetryService;
  const check = payload => {
    assert.deepEqual(payload.emergency_requests, [{ id: 'emergency-1' }]);
    assert.deepEqual(payload.upcoming_notifications, [{ id: 'notification-1' }]);
    assert.deepEqual(payload.suspension_recommendations, [{ alert_id: 'recommendation-1' }]);
  };
  check(JSON.parse(JSON.stringify(await service.generateCurrentTelemetry())));
  const messages = [];
  await service.registerWs({ readyState: 1, send: text => messages.push(JSON.parse(text)) });
  await service.broadcast();
  assert.equal(messages.length, 2);
  messages.forEach(check);

  const closedSocket = { readyState: 1, send: () => assert.fail('sent to a closed socket') };
  const registering = service.registerWs(closedSocket);
  closedSocket.readyState = 3;
  await registering;
});
