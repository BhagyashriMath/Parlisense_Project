const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EventEmitter } = require('node:events');
const { buildSync } = require('esbuild');
const vm = require('node:vm');
const path = require('node:path');

const bundle = buildSync({ entryPoints: [path.join(__dirname, '../services/video-room.service.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false });
const moduleShim = { exports: {} };
vm.runInNewContext(bundle.outputFiles[0].text, { module: moduleShim, exports: moduleShim.exports, require });
const { VideoRoomService } = moduleShim.exports;
class Socket extends EventEmitter {
  readyState = 1;
  messages = [];
  send(raw) { this.messages.push(JSON.parse(raw)); }
  close(code) { this.code = code; this.readyState = 3; this.emit('close'); }
  receive(message) { this.emit('message', Buffer.from(JSON.stringify(message))); }
  get id() { return this.messages.find(m => m.type === 'welcome').id; }
}
function setup() {
  const state = { sessionId: 'session-1', isActive: true };
  const room = new VideoRoomService(() => state);
  const join = name => { const socket = new Socket(); room.join(socket, name, state.sessionId); return socket; };
  return { state, room, join };
}
test('A and B publish to camera-off C, including a late viewer; stopping A leaves B available', () => {
  const { join } = setup();
  const a = join('A'); const b = join('B');
  a.receive({ type: 'publish', enabled: true });
  b.receive({ type: 'publish', enabled: true });
  const c = join('C');
  assert.deepEqual(c.messages[0].peers.map(p => [p.memberId, p.publishing]), [['A', true], ['B', true]]);
  for (const publisher of [a, b]) {
    publisher.receive({ type: 'signal', to: c.id, publisher: publisher.id,
      data: { description: { type: 'offer', sdp: 'video-offer' } } });
    c.receive({ type: 'signal', to: publisher.id, publisher: publisher.id,
      data: { description: { type: 'answer', sdp: 'receive-only-answer' } } });
    assert.equal(publisher.messages.at(-1).from, c.id);
  }
  assert.equal(c.messages.filter(m => m.type === 'signal').length, 2);
  a.receive({ type: 'publish', enabled: false });
  assert.equal(c.messages.at(-1).peer.publishing, false);
  b.receive({ type: 'signal', to: c.id, publisher: b.id,
    data: { candidate: { candidate: 'candidate:b' } } });
  assert.equal(c.messages.at(-1).from, b.id);
  a.close(1000);
  assert.deepEqual(c.messages.at(-1), { type: 'left', id: a.id });
});
test('room rejects inactive sessions, unauthorized publishers and forged sender identity', () => {
  const { join, room, state } = setup();
  const a = join('A'); const b = join('B'); const c = join('C');
  const signal = { type: 'signal', to: b.id, publisher: a.id, from: c.id,
    data: { description: { type: 'offer', sdp: 'test' } } };
  const before = b.messages.length;
  a.receive(signal);
  assert.equal(b.messages.length, before);
  a.receive({ type: 'publish', enabled: true });
  c.receive(signal);
  assert.equal(b.messages.at(-1).type, 'peer');
  a.receive(signal);
  assert.equal(b.messages.at(-1).from, a.id);
  const wrongRoom = new Socket(); room.join(wrongRoom, 'D', 'other');
  assert.equal(wrongRoom.code, 4003);
  a.emit('message', Buffer.from('malformed'));
  state.isActive = false; room.sweep();
  for (const socket of [a, b, c]) assert.equal(socket.code, 4003);
});
test('replacing a member connection removes stale feeds and accepts fresh publication', () => {
  const { join } = setup();
  const a = join('A'); const c = join('C');
  a.receive({ type: 'publish', enabled: true });
  const replacement = join('A');
  assert.equal(a.code, 4009);
  assert.notEqual(replacement.id, a.id);
  assert.ok(c.messages.some(m => m.type === 'left' && m.id === a.id));
  assert.equal(c.messages.at(-1).peer.publishing, false);
  replacement.receive({ type: 'publish', enabled: true });
  assert.equal(c.messages.at(-1).peer.publishing, true);
});
