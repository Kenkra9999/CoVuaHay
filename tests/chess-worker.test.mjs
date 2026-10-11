import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const directory = new URL("../dist/client/engine/", import.meta.url);
const wasm = readFileSync(new URL("stockfish-19-lite-single.wasm", directory));

test("deployment includes unchanged Stockfish JS, WASM and license", () => {
  for (const filename of ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm", "COPYING.txt"]) {
    assert.deepEqual(readFileSync(new URL(filename, directory)), readFileSync(new URL(`../public/engine/${filename}`, import.meta.url)));
  }
  assert.ok(WebAssembly.validate(wasm));
});

test("deployment includes every selectable cover and the battlefield background", () => {
  for (const asset of ["chess-battlefield.png", "chess-duel.png", "covers/sakura.svg", "covers/frost.svg", "covers/nebula.svg"]) {
    assert.deepEqual(readFileSync(new URL(`../dist/client/${asset}`, import.meta.url)), readFileSync(new URL(`../public/${asset}`, import.meta.url)), asset);
  }
});

test("deployment includes all 72 pieces in the six selectable collections", () => {
  for (const set of ["sakura", "elemental", "royal", "nebula", "jade", "mecha"]) {
    for (const color of ["w", "b"]) {
      for (const kind of ["P", "N", "B", "R", "Q", "K"]) {
        const asset = `pieces/${set}/${color}${kind}.svg`;
        assert.deepEqual(readFileSync(new URL(`../dist/client/${asset}`, import.meta.url)), readFileSync(new URL(`../public/${asset}`, import.meta.url)), asset);
      }
    }
  }
});
