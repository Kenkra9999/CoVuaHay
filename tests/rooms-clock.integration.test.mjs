import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Local integration only: creates disposable rooms; timeout fixtures edit just those rows.
const base = process.env.CHESS_TEST_URL || 'http://localhost:3000';
async function request(path, method = 'GET', token, body) {
  const response = await fetch(base + '/api/rooms' + path, { method,
    headers: { ...(token ? { 'x-player-token': token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function pair(settings = {}) {
  const created = await request('', 'POST', null, { name: 'Minh Trắng', totalMinutes: 5, moveSeconds: 60, ...settings });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const joined = await request('/' + created.data.room.code + '/join', 'POST', null, { name: 'An Đen' });
  assert.equal(joined.status, 200);
  return { code: created.data.room.code, white: created.data.token, black: joined.data.token, room: joined.data.room };
}
test('server validates controls, preserves named seats, and starts clocks only on join', async () => {
  for (const settings of [{ totalMinutes: 4 }, { totalMinutes: 101 }, { moveSeconds: 59 }, { moveSeconds: 301 }, { totalMinutes: '5' }, { name: '' }, { name: 'a'.repeat(25) }]) {
    assert.equal((await request('', 'POST', null, { totalMinutes: 5, moveSeconds: 60, ...settings })).status, 400);
  }
  const created = await request('', 'POST', null, { name: 'Hà', totalMinutes: 100, moveSeconds: 300 });
  assert.equal(created.data.room.clock.totalSeconds, 6000);
  assert.equal(created.data.room.clock.whiteMs, 6000000);
  assert.equal(created.data.room.clock.turnStartedAt, null);
  const fixture = await pair();
  assert.equal(fixture.room.players.white.name, 'Minh Trắng');
  assert.equal(fixture.room.players.black.name, 'An Đen');
  assert.ok(fixture.room.clock.turnStartedAt);
  const renamed = await request('/' + fixture.code + '/player', 'PATCH', fixture.black, { name: 'An mới' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.data.room.players.black.name, 'An mới');
  assert.equal(renamed.data.room.version, fixture.room.version, 'renaming does not invalidate a pending legal move');
  assert.equal((await request('/' + fixture.code + '/player', 'PATCH', null, { name: 'Hacker' })).status, 403);
  assert.equal((await request('/' + fixture.code + '/player', 'PATCH', fixture.white, { name: ' ' })).status, 400);
  const move = await request('/' + fixture.code + '/move', 'POST', fixture.white, { from: 'e2', to: 'e4', version: fixture.room.version });
  assert.equal(move.status, 200);
  assert.ok(move.data.room.clock.whiteMs < 300000);
  assert.equal(move.data.room.clock.blackMs, 300000);
  assert.equal(move.data.room.players.black.name, 'An mới');
  const resumed = await request('/' + fixture.code + '/join', 'POST', fixture.white);
  assert.equal(resumed.status, 200);
  assert.equal(resumed.data.room.color, 'w');
  assert.equal(resumed.data.room.moves[0].san, 'e4');
  assert.equal((await request('/' + fixture.code)).data.room.color, null);
});
test('draw requests need both players, preserve running clocks, and freeze on agreement', async () => {
  const fixture = await pair();
  assert.equal((await request('/' + fixture.code + '/draw', 'POST', null, { action: 'offer' })).status, 403);
  const offered = await request('/' + fixture.code + '/draw', 'POST', fixture.white, { action: 'offer' });
  assert.equal(offered.data.room.drawOffer, 'w');
  assert.equal(offered.data.room.clock.turnStartedAt, fixture.room.clock.turnStartedAt);
  assert.equal((await request('/' + fixture.code + '/draw', 'POST', fixture.white, { action: 'accept' })).status, 409);
  const accepted = await request('/' + fixture.code + '/draw', 'POST', fixture.black, { action: 'accept' });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.room.status, 'draw');
  assert.equal(accepted.data.room.endReason, 'agreement');
  assert.equal(accepted.data.room.clock.turnStartedAt, null);
  assert.equal((await request('/' + fixture.code + '/move', 'POST', fixture.white, { from: 'e2', to: 'e4', version: accepted.data.room.version })).status, 409);
});
test('offline timeouts are persisted on re-entry and reject late moves', { skip: !process.env.CHESS_TEST_DB }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'fixture database is only allowed with a local test server');
  const database = new DatabaseSync(process.env.CHESS_TEST_DB);
  database.exec('PRAGMA busy_timeout = 5000');
  try {
    for (const totalExpired of [false, true]) {
      const fixture = await pair();
      database.prepare("UPDATE rooms SET turn_started_at = ?, white_remaining_ms = ? WHERE code = ?").run(Date.now() - (totalExpired ? 2000 : 61000), totalExpired ? 1000 : 300000, fixture.code);
      const resumed = await request('/' + fixture.code, 'GET', fixture.white);
      assert.equal(resumed.data.room.status, 'black_won');
      assert.equal(resumed.data.room.endReason, totalExpired ? 'timeout' : 'move_timeout');
      assert.equal(resumed.data.room.clock.turnStartedAt, null);
      assert.equal(resumed.data.room.clock.blackMs, 300000);
      assert.equal(resumed.data.room.moves.length, 0);
      const late = await request('/' + fixture.code + '/move', 'POST', fixture.white, { from: 'e2', to: 'e4', version: fixture.room.version });
      assert.equal(late.status, 409);
      assert.equal(late.data.room.status, 'black_won');
      assert.equal((await request('/' + fixture.code, 'GET', fixture.black)).data.room.status, 'black_won');
    }
  } finally { database.close(); }
});
