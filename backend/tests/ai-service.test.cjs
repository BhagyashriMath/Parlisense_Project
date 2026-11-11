const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

test('offensive language detection flags common phrases and loads its model from backend cwd', async () => {
  const result = await build({
    entryPoints: [path.join(__dirname, '../services/ai.service.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    plugins: [{
      name: 'mock-config',
      setup(builder) {
        builder.onResolve({ filter: /^\.\.\/config$/ }, () => ({ path: 'config', namespace: 'mock' }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const rulesConfig = {};' }));
      }
    }]
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, require, process, console
  });

  const service = new module.exports.AiService();
  assert.ok(service.offensiveModel);
  const noSpeech = service.analyzeSpeechRelevance('');
  assert.equal(noSpeech.score, 0);
  assert.equal(noSpeech.isOffTopic, false);
  assert.equal(noSpeech.matched.length, 0);
  const agendaMatch = service.analyzeSpeechRelevance('We need better public health services.', 'Public Health Bill');
  assert.equal(agendaMatch.isOffTopic, false);
  assert.ok(agendaMatch.matched.includes('health'));
  const detection = service.analyzeOffensive('That was a shameful, stupid lie!');
  assert.equal(detection.isOffensive, true);
  assert.deepEqual(Array.from(detection.flaggedWords), ['stupid', 'lie', 'shameful']);

  const summary = service.generateLiveSummary('Public Health Bill', [
    { text: 'I recommend expanding rural clinics. Rural clinics need better vaccine access.', name: 'A. Member' }
  ]);
  assert.match(summary.brief_summary, /Public Health Bill/);
  assert.match(summary.brief_summary, /rural clinics/);
  assert.equal(summary.policy_suggestions[0].member_name, 'A. Member');
  assert.ok(summary.key_topics.some(topic => topic.title === 'Rural'));

  const emptySummary = service.generateLiveSummary('Public Health Bill', []);
  assert.match(emptySummary.brief_summary, /No speech has been transcribed/);
  assert.deepEqual(Array.from(emptySummary.key_topics), []);
  assert.deepEqual(Array.from(emptySummary.policy_suggestions), []);
});