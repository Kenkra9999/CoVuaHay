import test from "node:test";
import assert from "node:assert/strict";
import { pieceTravels, squarePoint, pieceTravelMs } from "../lib/chess-motion.ts";

const piece = (id, square, type = "p", color = "w") => ({ id, square, type, color });
test("initial render, selection and style changes produce no move trails", () => {
  const pieces = [piece("e2", "e2")];
  assert.deepEqual(pieceTravels(null, pieces), []);
  assert.deepEqual(pieceTravels(pieces, pieces.map(p => ({ ...p }))), []);
});
test("a capture tracks the surviving mover, rather than the captured piece", () => {
  const previous = [piece("d1", "d4", "q"), piece("e7", "e5", "p", "b")];
  assert.deepEqual(pieceTravels(previous, [piece("d1", "e5", "q")]).map(move => [move.piece.type, move.from, move.to]), [["q", "d4", "e5"]]);
});
test("castling emits both the king's privileged trail and the rook's normal trail", () => {
  const previous = [piece("e1", "e1", "k"), piece("h1", "h1", "r")];
  const current = [piece("e1", "g1", "k"), piece("h1", "f1", "r")];
  assert.deepEqual(pieceTravels(previous, current).map(move => move.piece.type), ["k", "r"]);
});
test("promotion keeps the pawn identity and receives the new queen's effect", () => {
  const [move] = pieceTravels([piece("a2", "a7")], [piece("a2", "a8", "q")]);
  assert.equal(move.piece.type, "q"); assert.equal(move.from, "a7"); assert.equal(move.to, "a8");
});
test("resetting and large replay jumps suppress batches of unrelated trails", () => {
  assert.deepEqual(pieceTravels([piece("e2", "e4")], [piece("e2", "e2"), piece("d2", "d2")]), []);
  const previous = [piece("a", "a2"), piece("b", "b2"), piece("c", "c2")];
  assert.deepEqual(pieceTravels(previous, previous.map(p => ({ ...p, square: p.square[0] + "4" }))), []);
});
test("trail endpoints align with the grid in either orientation", () => {
  assert.deepEqual(squarePoint("a8", "w"), { x: 50, y: 50 });
  assert.deepEqual(squarePoint("h1", "w"), { x: 750, y: 750 });
  for (const square of ["e1", "d8", "b3", "g6"]) {
    const white = squarePoint(square, "w"), black = squarePoint(square, "b");
    assert.equal(white.x + black.x, 800); assert.equal(white.y + black.y, 800);
  }
  assert.ok(pieceTravelMs("k") > pieceTravelMs("p"));
  assert.ok(pieceTravelMs("q") > pieceTravelMs("n"));
});
