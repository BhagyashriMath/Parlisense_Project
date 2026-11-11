// Real Chrome media test with synthetic cameras; no application database or credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { WebSocket, WebSocketServer } = require('ws');
const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const browser = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('real browsers: A/B cameras render in camera-off C, reconnect, stop and session end',
  { skip: !fs.existsSync(browser), timeout: 90000 }, async t => {
  const root = path.resolve(__dirname, '../..');
  const bundled = await build({ entryPoints: [path.join(root, 'backend/services/video-room.service.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false });
  const moduleShim = { exports: {} };
  vm.runInNewContext(bundled.outputFiles[0].text, { module: moduleShim, exports: moduleShim.exports, require });
  const state = { sessionId: 'browser-test', isActive: true };
  const room = new moduleShim.exports.VideoRoomService(() => state);
  const app = await build({ stdin: { contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { ChamberVideoGrid } from './src/shared/components/ChamberVideoGrid';
    sessionStorage.setItem('parlisense_token', new URLSearchParams(location.search).get('id'));
    window.root = createRoot(document.getElementById('root'));
    window.root.render(React.createElement(ChamberVideoGrid));
  `, resolveDir: path.join(root, 'frontend'), loader: 'tsx' }, bundle: true, write: false,
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolated-dashboard', setup(builder) {
      builder.onResolve({ filter: /infrastructure\/context\/ParliamentContext$/ }, () => ({ path: 'context', namespace: 'test' }));
      builder.onResolve({ filter: /infrastructure\/api\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'api'
        ? 'export const API_BASE = "";'
        : `const id = new URLSearchParams(location.search).get('id');
           const noop = () => {};
           export const useParliament = () => ({
             telemetry: { session_id: 'browser-test', is_active: true },
             members: ['A','B','C','S'].map(member_id => ({ member_id, seat_id: member_id, name: member_id, role: member_id === 'S' ? 'Speaker' : 'Member' })),
             currentUser: id === 'S' ? { role: 'speaker', memberName: 'S' } : { role: 'member', memberId: id }, selectedMemberId: id === 'S' ? 'A' : id,
             setIsWebcamActive: noop, setIsMicActive: noop, isMicActive: false
           });` }));
    } }] });
  const server = createServer((req, res) => {
    if (req.url.startsWith('/app.js')) { res.setHeader('Content-Type', 'text/javascript'); res.end(app.outputFiles[0].text); }
    else res.end('<html><div id="root"></div><script src="/app.js"></script></html>');
  });
  const sockets = new Map();
  const wsServer = new WebSocketServer({ server });
  wsServer.on('connection', ws => ws.once('message', raw => {
    const data = JSON.parse(raw); sockets.set(data.token, ws); room.join(ws, data.token, data.sessionId);
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { for (const ws of wsServer.clients) ws.terminate(); wsServer.close(); server.close(); });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'parlisense-video-test-'));
  const chrome = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let closeBrowser = async () => {};
  t.after(async () => {
    await closeBrowser();
    chrome.kill();
    await pause(500);
    // Only delete the unique temporary profile created by this test.
    if (path.dirname(profile) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('parlisense-video-test-')) {
      await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    }
  });
  let devtools;
  for (let i = 0; i < 100; i++) {
    try { devtools = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/); break; } catch {}
    await pause(100);
  }
  assert.ok(devtools, 'Chrome remote debugger started');
  const cdp = new WebSocket(`ws://127.0.0.1:${devtools[0]}${devtools[1]}`);
  await new Promise((resolve, reject) => { cdp.once('open', resolve); cdp.once('error', reject); });
  t.after(() => cdp.close());
  let sequence = 0; const pending = new Map();
  cdp.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.id) { const callback = pending.get(message.id); pending.delete(message.id); callback?.(message); }
  });
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, message => message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result));
    cdp.send(JSON.stringify({ id, method, params, sessionId }));
  });
  // Graceful shutdown also closes Chrome's child processes before deleting the
  // temporary profile; killing only the parent can leave Windows files locked.
  closeBrowser = () => Promise.race([command('Browser.close').catch(() => {}), pause(2000)]);
  const evaluate = async (session, expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (session, expression, label) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(session, expression)) return;
      await pause(100);
    }
    assert.fail(`${label}: ${await evaluate(session, 'document.body.innerText')}`);
  };
  const page = async id => {
    const target = await command('Target.createTarget', { url: `http://127.0.0.1:${server.address().port}/?id=${id}` });
    const { sessionId } = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    await waitFor(sessionId, '!!document.getElementById("chamber-grid-toggle-cam-btn") && !document.getElementById("chamber-grid-toggle-cam-btn").disabled', `Connect ${id}`);
    return sessionId;
  };
  const start = session => evaluate(session, 'document.getElementById("chamber-grid-toggle-cam-btn").click()');
  const playing = count => `document.querySelectorAll('video').length === ${count} && [...document.querySelectorAll('video')].every(v => v.readyState >= 2 && v.videoWidth > 0)`;
  const a = await page('A'); const b = await page('B');
  await Promise.all([start(a), start(b)]);
  await waitFor(a, playing(2), 'A sees both cameras');
  const c = await page('C');
  await waitFor(c, playing(2), 'Late camera-off C sees A and B');
  assert.match(await evaluate(c, 'document.body.innerText'), /Start Cam/);
  await evaluate(c, 'document.querySelector("video").closest(".group").click()');
  await waitFor(c, playing(3), 'Spotlight and thumbnail both play');
  await evaluate(c, `[...document.querySelectorAll('button')].find(b => b.title === 'Return to multi-video grid view').click()`);
  const previousC = sockets.get('C');
  previousC.terminate();
  for (let i = 0; i < 100 && sockets.get('C') === previousC; i++) await pause(100);
  assert.notEqual(sockets.get('C'), previousC, 'C creates a new signaling connection');
  await waitFor(c, playing(2), 'C receives cameras after reconnect');
  await evaluate(c, 'navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Permission denied", "NotAllowedError"); }');
  await start(c);
  await waitFor(c, 'document.body.innerText.includes("Permission denied")', 'Permission denial displayed');
  assert.equal(await evaluate(c, playing(2)), true, 'Denied camera permission does not interrupt viewing');
  await start(a);
  await waitFor(c, playing(1), 'Stopping A leaves B visible');
  await start(a);
  await waitFor(c, playing(2), 'Restarting A restores its camera');
  // Restored Speaker sessions may omit memberId; signaling authenticates the
  // account from its token and must not depend on the selected floor member.
  const speaker = await page('S');
  await start(speaker);
  await waitFor(speaker, playing(3), 'Speaker starts camera without a client-side member ID');
  await waitFor(c, playing(3), 'Camera-off member receives Speaker camera');
  assert.equal(await evaluate(speaker, `document.querySelector('video.mirror-mode').closest('.group').innerText.includes('Speaker')`), true);
  await start(speaker);
  await waitFor(c, playing(2), 'Speaker stops camera without disrupting member feeds');
  await start(speaker);
  await waitFor(c, playing(3), 'Speaker restarts camera');
  state.isActive = false; room.sweep();
  await waitFor(c, 'document.querySelectorAll("video").length === 0', 'Session end removes remote feeds');
  await waitFor(a, 'document.querySelectorAll("video").length === 0', 'Session end stops local camera');
  await waitFor(speaker, 'document.querySelectorAll("video").length === 0', 'Session end stops Speaker camera');
});
