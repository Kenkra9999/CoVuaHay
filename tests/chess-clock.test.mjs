import test from 'node:test';
import assert from 'node:assert/strict';
import { chessClock, validTimeControl } from '../lib/chess-clock.ts';

const position = { fen: 'board w - - 0 1', status: 'playing', whiteMs: 300000, blackMs: 300000, turnStartedAt: 10000, moveLimitSeconds: 60 };
test('waiting and completed games do not consume time', () => {
  for (const status of ['waiting', 'draw', 'black_won']) {
    const clock = chessClock({ ...position, status }, 999999);
    assert.equal(clock.whiteMs, 300000);
    assert.equal(clock.expired, false);
  }
});
test('only the current side is charged and the turn budget resets after a move', () => {
  const white = chessClock(position, 40000);
  assert.equal(white.whiteMs, 270000);
  assert.equal(white.blackMs, 300000);
  assert.equal(white.moveRemainingMs, 30000);
  const black = chessClock({ ...position, fen: 'board b - - 0 1', whiteMs: white.whiteMs, turnStartedAt: 40000 }, 55000);
  assert.equal(black.whiteMs, 270000);
  assert.equal(black.blackMs, 285000);
  assert.equal(black.moveRemainingMs, 45000);
});
test('the exact turn deadline and elapsed offline time both lose the game', () => {
  assert.equal(chessClock(position, 69999).expired, false);
  assert.equal(chessClock(position, 70000).reason, 'move_timeout');
  assert.equal(chessClock(position, 999999).expired, true);
  const nearEnd = chessClock({ ...position, whiteMs: 15000 }, 25000);
  assert.equal(nearEnd.reason, 'timeout');
  assert.equal(nearEnd.whiteMs, 0);
  assert.equal(nearEnd.blackMs, 300000);
});
test('negative elapsed time is clamped and time controls reject malformed values', () => {
  assert.equal(chessClock(position, 5000).whiteMs, 300000);
  for (const settings of [[5,60], [100,300], [15,120]]) assert.ok(validTimeControl(...settings));
  for (const settings of [[4,60], [101,300], [5,59], [5,301], [5.5,60], ['5',60], [5,NaN]]) assert.equal(validTimeControl(...settings), false);
});
