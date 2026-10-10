import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { findBestMove } from "../lib/chess-ai.ts";

for (const difficulty of ["easy", "medium", "hard"]) {
  test(`${difficulty}: returns a legal opening move and preserves the position`, () => {
    const game = new Chess();
    const fen = game.fen();
    const started = performance.now();
    const move = findBestMove(game, difficulty);
    assert.equal(game.fen(), fen);
    assert.deepEqual(game.history(), []);
    assert.ok(game.move(move));
    assert.ok(performance.now() - started < 4000, "search respects its time budget");
  });
}

test("AI plays 24 consecutive legal moves for both colors", () => {
  const game = new Chess();
  for (let ply = 0; ply < 24 && !game.isGameOver(); ply++) {
    const fen = game.fen();
    const move = findBestMove(game, "easy");
    assert.equal(game.fen(), fen);
    assert.ok(game.move(move));
  }
  assert.ok(game.history().length > 5);
});

test("finds mate in one for white and black", () => {
  for (const fen of ["7k/5Q2/6K1/8/8/8/8/8 w - - 0 1", "8/8/8/8/8/6k1/5q2/7K b - - 0 1"]) {
    const game = new Chess(fen);
    game.move(findBestMove(game, "medium"));
    assert.ok(game.isCheckmate());
  }
});

test("captures a hanging queen", () => {
  const game = new Chess("7k/8/8/3q4/8/8/8/K2R4 w - - 0 1");
  const moved = game.move(findBestMove(game, "easy"));
  assert.equal(moved.captured, "q");
});

test("promotes legally rather than omitting the promotion choice", () => {
  const game = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
  const move = findBestMove(game, "medium");
  assert.equal(move.promotion, "q");
  assert.ok(game.move(move));
});

test("game-over positions return no move", () => {
  assert.equal(findBestMove(new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1"), "hard"), null);
  assert.equal(findBestMove(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), "medium"), null);
  const repeated = new Chess();
  for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) repeated.move(san);
  assert.ok(repeated.isThreefoldRepetition());
  assert.equal(findBestMove(repeated, "easy"), null);
});
