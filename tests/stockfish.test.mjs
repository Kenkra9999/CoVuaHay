import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Chess } from "chess.js";
import { describeMove, parseUciMove, parseEngineLine, principalVariation, searchStockfish } from "../lib/stockfish.ts";

// Exercise the vendored JS + WASM engine through the same message protocol used
// by the browser adapter. No mocked engine responses or network downloads.
const directory = mkdtempSync(join(tmpdir(), "nuocco-stockfish-"));
const engineFile = join(directory, "stockfish-19-lite-single.cjs");
copyFileSync(new URL("../public/engine/stockfish-19-lite-single.js", import.meta.url), engineFile);
copyFileSync(new URL("../public/engine/stockfish-19-lite-single.wasm", import.meta.url), join(directory, "stockfish-19-lite-single.wasm"));
after(() => rmSync(directory, { recursive: true, force: true }));

class EngineWorker {
  constructor(url) {
    assert.equal(url, "/engine/stockfish-19-lite-single.js");
    this.child = spawn(process.execPath, [engineFile], { stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    this.child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const data of lines) this.onmessage?.({ data });
    });
    this.child.on("error", (error) => this.onerror?.(error));
    this.child.stdin.on("error", (error) => this.onerror?.(error));
  }
  postMessage(command) { this.child.stdin.write(`${command}\n`); }
  terminate() { this.child.kill(); }
}
globalThis.Worker = EngineWorker;
globalThis.window = { setTimeout, clearTimeout };

test("parses UCI promotions, rejects invalid squares and normalizes black scores", () => {
  assert.deepEqual(parseUciMove("a7a8q"), { from: "a7", to: "a8", promotion: "q" });
  for (const invalid of ["(none)", "a0a8", "0000", "e2e4x"]) assert.equal(parseUciMove(invalid), null);
  const line = parseEngineLine("info depth 12 multipv 2 score cp 125 nodes 900 pv e7e5 g1f3", "b");
  assert.equal(line.score, -1.25);
  assert.equal(line.depth, 12);
  assert.equal(line.rank, 2);
  assert.equal(parseEngineLine("info depth 8 score mate 3 pv d8h4", "b").mate, -3);
  assert.equal(parseEngineLine("info depth 9 score cp 50 lowerbound pv e2e4", "w"), null);
});

test("real Stockfish returns three legal analysis lines without changing the board", async () => {
  const game = new Chess();
  const fen = game.fen();
  const updates = [];
  const result = await searchStockfish([], { analysis: true, onInfo: (lines) => updates.push(lines) });
  assert.equal(game.fen(), fen);
  assert.equal(result.lines.length, 3);
  assert.ok(updates.length > 0);
  assert.ok(result.lines[0].depth > 2);
  for (const line of result.lines) {
    const preview = new Chess();
    for (const uci of line.pv) assert.ok(preview.move(parseUciMove(uci)));
    assert.ok(Number.isFinite(line.score));
  }
  assert.ok(game.move(result.move));
  assert.equal(result.move.from + result.move.to + (result.move.promotion || ""), result.lines[0].pv[0]);
});

test("real Stockfish opponent plays legal moves at all three difficulty levels", async () => {
  const game = new Chess();
  game.move("e4");
  for (const difficulty of ["easy", "medium", "hard"]) {
    const result = await searchStockfish(game.history({ verbose: true }), { difficulty });
    assert.ok(game.move(result.move));
  }
});

test("Stockfish finds Fool's mate for black and reports the winning side correctly", async () => {
  const game = new Chess();
  for (const san of ["f3", "e5", "g4"]) game.move(san);
  const result = await searchStockfish(game.history({ verbose: true }), { analysis: true });
  assert.equal(result.move.from, "d8");
  assert.equal(result.move.to, "h4");
  assert.equal(result.lines[0].mate, -1);
  assert.deepEqual(principalVariation(game, result.lines[0].pv), ["Qh4#"]);
  assert.match(describeMove(game, result.move, result.lines[0]), /chiếu hết/);
  assert.ok(game.move(result.move));
  assert.ok(game.isCheckmate());
});

test("cancels an active search when the position is replaced", async () => {
  const controller = new AbortController();
  const promise = searchStockfish([], { analysis: true, deep: true, signal: controller.signal, onInfo: () => controller.abort() });
  await assert.rejects(promise, { name: "AbortError" });
});

test("rejects bad move history and preserves a pre-aborted signal", async () => {
  await assert.rejects(searchStockfish([{ from: "e2", to: "e5" }]));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(searchStockfish([], { signal: controller.signal }), { name: "AbortError" });
});
