const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');
function load(file) {
  const result = buildSync({ entryPoints: [path.resolve(__dirname, file)], bundle: true,
    platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require });
  return module.exports;
}
const { readSessionClock: read, updateSessionClock: update } = load('../services/session-clock.ts');
const initial = () => ({ isActive: false, isPaused: false, startTime: 0, pauseTimestamp: null,
  pausedElapsedSeconds: 0, activeSpeakerId: 'A', speakingStartTime: 0, speakingDuration: 0, memberSpeakingMs: {} });

test('starting after server idle begins at zero; clocks catch up without interval ticks', () => {
  const state = update(initial(), { isActive: true }, 100000);
  assert.equal(read(state, 100000).sessionSeconds, 0);
  assert.equal(read(state, 165900).speakingSeconds, 65);
  assert.equal(read(state, 3700000).sessionSeconds, 3600);
});

test('pause freezes exact time without polling; resume excludes pauses and retains fractional seconds', () => {
  let state = update(initial(), { isActive: true }, 1000);
  state = update(state, { isPaused: true }, 11900);
  assert.equal(read(state, 99999).speakingSeconds, 10);
  assert.equal(read(state, 99999).sessionSeconds, 10);
  state = update(state, { isPaused: true }, 15000);
  state = update(state, { isPaused: false }, 20000);
  assert.equal(read(state, 20100).speakingSeconds, 11);
  state = update(state, { isPaused: false }, 20200);
  assert.equal(read(state, 21100).sessionSeconds, 12);
});

test('switching during a pause starts the new turn at resume and preserves member quotas', () => {
  let state = update(initial(), { isActive: true }, 1000);
  state = update(state, { isPaused: true }, 11000);
  state = update(state, { activeSpeakerId: 'B' }, 21000);
  assert.equal(read(state, 25000).memberSeconds.A, 10);
  assert.equal(read(state, 25000).speakingSeconds, 0);
  state = update(state, { isPaused: false }, 31000);
  assert.equal(read(state, 35000).speakingSeconds, 4);
  state = update(state, { activeSpeakerId: 'A' }, 35000);
  assert.equal(read(state, 40000).memberSeconds.A, 15);
  assert.equal(read(state, 40000).memberSeconds.B, 4);
  assert.equal(read(state, 40000).speakingSeconds, 5);
});

test('same speaker selection is idempotent; removing floor holder stops only the floor timer', () => {
  let state = update(initial(), { isActive: true }, 1000);
  state = update(state, { activeSpeakerId: 'A' }, 6000);
  assert.equal(read(state, 11000).speakingSeconds, 10);
  state = update(state, { activeSpeakerId: '' }, 11000);
  assert.equal(read(state, 21000).speakingSeconds, 0);
  assert.equal(read(state, 21000).memberSeconds.A, 10);
  assert.equal(read(state, 21000).sessionSeconds, 20);
});

test('ending freezes session totals and restarting clears the previous session', () => {
  let state = update(initial(), { isActive: true }, 1000);
  state = update(state, { isPaused: true }, 11000);
  state = update(state, { isActive: false, isPaused: false }, 21000);
  assert.equal(read(state, 51000).sessionSeconds, 10);
  assert.equal(read(state, 51000).memberSeconds.A, 10);
  assert.equal(read(state, 51000).speakingSeconds, 0);
  state = update(state, { isActive: true }, 61000);
  assert.equal(read(state, 61000).memberSeconds.A, 0);
  assert.equal(read(state, 62000).sessionSeconds, 1);
  state = update(state, { isActive: true, startTime: 65000 }, 65000);
  assert.equal(read(state, 65000).speakingSeconds, 0);
});

test('both console quota calculations agree at warning and exhausted boundaries', () => {
  const { calculateMemberTimeMetrics: member } = load('../../frontend/src/features/member/model/member.model.ts');
  const { calculateSpeakingProgress: speaker } = load('../../frontend/src/features/speaker/model/speaker.model.ts');
  for (const used of [0, 255, 299, 300, 350]) {
    assert.equal(member(used, 300).remainingSeconds, speaker(used, 300).timeRemaining);
    assert.equal(member(used, 300).timePercent, speaker(used, 300).timePercent);
    assert.equal(member(used, 300).isQuotaExhausted, speaker(used, 300).isTimeOver);
  }
  assert.equal(member(0, 0).timePercent, 100);
  assert.equal(speaker(0, 0).timePercent, 100);
});
