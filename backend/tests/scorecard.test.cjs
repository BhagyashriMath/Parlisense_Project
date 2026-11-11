const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

async function repository(events = [], saved) {
  const mocks = {
    '../database/db': 'export const db = globalThis.mockDb;',
    './member.repository': 'export const memberRepository = globalThis.mockMembers;'
  };
  const result = await build({
    entryPoints: [path.join(__dirname, '../repositories/scorecard.repository.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'isolated-scoring', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace: 'mock' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path] }));
    }}]
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, require,
    mockDb: {
      get: async sql => sql.includes('SELECT payload') ? (saved ? { payload: JSON.stringify(saved) } : undefined) : sql.includes('AVG') ? { avg: 1 } : { count: 0 },
      all: async sql => sql.includes('FROM violations') ? events : [],
      run: async () => {}
    },
    mockMembers: {
      findById: async () => ({ member_id: 'M1', name: 'Member', role: 'Member', status: 'ACTIVE' }),
      findAll: async () => ({ members: [{ member_id: 'M1', role: 'Member' }] })
    }
  });
  return module.exports.scorecardRepository;
}

test('member scorecards and speaker reports use the same complete penalty breakdown', async () => {
  const categories = ['SPEAKING_TIME', 'SPEAKING_TIME_WARNING', 'OFF_TOPIC_SPEECH', 'INTERRUPTION', 'UNAUTHORIZED_MOVEMENT', 'OFFENSIVE_LANGUAGE', 'HIGH_NOISE', 'NOISE_WARNING', 'HEATED_DEBATE'];
  const repo = await repository(categories.map(category => ({ category, penalty_points: category.endsWith('WARNING') ? 5 : 10 })));
  const card = await repo.getMemberScorecard('M1');
  const neg = card.negative_deductions;
  assert.equal(neg.total_negative_deductions, 80);
  assert.equal(neg.speaking_time_overage_deduction, 15);
  assert.equal(neg.excessive_noise_deduction, 15);
  assert.equal(neg.rule_violations_deduction, 10);
  for (const key of ['off_topic_speech_deduction', 'interruptions_cross_talk_deduction', 'disruptive_movement_deduction', 'offensive_language_deduction']) assert.equal(neg[key], 10);
  assert.equal(Object.entries(neg).filter(([key]) => key !== 'total_negative_deductions').reduce((sum, [, value]) => sum + value, 0), 80);
  assert.equal(card.overall_score, Math.max(0, card.positive_marks.total_positive_marks - 80));
  const report = await repo.generateSessionReport('session', 'topic', false);
  assert.equal(JSON.stringify(report.member_scorecards[0].negative_deductions), JSON.stringify(neg));
});

test('no infractions produce zero deductions', async () => {
  const card = await (await repository()).getMemberScorecard('M1');
  assert.ok(Object.values(card.negative_deductions).every(value => value === 0));
});

test('saved scorecards accept the legacy total and preserve a canonical zero', async () => {
  for (const deductions of [{ total_penalties_deduction: 25 }, { total_penalties_deduction: 25, total_negative_deductions: 0 }]) {
    const repo = await repository([], { negative_deductions: deductions });
    const card = await repo.getScorecard('M1');
    assert.equal(card.negative_deductions.total_negative_deductions, deductions.total_negative_deductions ?? 25);
  }
});

test('session reports use observed speaking time and do not invent resolutions', async () => {
  const repo = await repository();
  const report = await repo.generateSessionReport('session', 'topic', false, { M1: 123 });
  assert.equal(report.member_scorecards[0].statistics.speaking_time_seconds, 123);
  assert.equal(report.session_statistics.total_speaking_time_minutes, 2);
  assert.deepEqual(Array.from(report.key_resolutions), []);
  assert.equal(report.session_information.start_time, 'Unavailable');
});
