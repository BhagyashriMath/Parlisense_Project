const assert = require('node:assert/strict');
const { test } = require('node:test');
const { build } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

test('cached transcripts can be limited to the active session', async () => {
  const transcripts = [
    { id: 'old-1', session_id: 'previous', text: 'Previous sitting speech' },
    { id: 'new-1', session_id: 'current', text: 'Current sitting speech' },
    { id: 'old-2', session_id: 'previous', text: 'More previous speech' }
  ];
  const result = await build({
    entryPoints: [path.join(__dirname, '../repositories/transcript.repository.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    plugins: [{
      name: 'mock-database',
      setup(builder) {
        builder.onResolve({ filter: /^\.\.\/database\/db$/ }, () => ({ path: 'database', namespace: 'mock' }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: `export const db = { all: async () => ${JSON.stringify(transcripts)} };`
        }));
      }
    }]
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, require, process, console
  });

  const repository = new module.exports.TranscriptRepository();
  await repository.findRecent(10);
  assert.deepEqual(
    Array.from(repository.getCachedRecent(8, 'current'), transcript => transcript.id),
    ['new-1']
  );
});