import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

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

test("deployment includes all 96 pieces in the eight selectable collections", () => {
  for (const set of ["sakura", "elemental", "royal", "nebula", "jade", "mecha", "dragon-abyss", "celestial"]) {
    for (const color of ["w", "b"]) {
      for (const kind of ["P", "N", "B", "R", "Q", "K"]) {
        const asset = `pieces/${set}/${color}${kind}.svg`;
        assert.deepEqual(readFileSync(new URL(`../dist/client/${asset}`, import.meta.url)), readFileSync(new URL(`../public/${asset}`, import.meta.url)), asset);
      }
    }
  }
});

test("deployment preserves split board artwork and the transparent original wing layer", () => {
  for (const asset of ["icefire.png", "celestial.png", "celestial-wingless.png", "celestial-wings.png"]) {
    assert.deepEqual(readFileSync(new URL(`../dist/client/boards/vip/${asset}`, import.meta.url)), readFileSync(new URL(`../public/boards/vip/${asset}`, import.meta.url)), asset);
  }
  // PNG IHDR color type 6 is RGBA, required so the wing layer has no solid background.
  assert.equal(readFileSync(new URL("../public/boards/vip/celestial-wings.png", import.meta.url))[25], 6);
});

test("fast artwork is packaged without missing files and downloads at a fraction of PNG size", () => {
  const boards = readdirSync(new URL("../public/boards/vip/", import.meta.url)).filter(name => name.endsWith(".webp")).map(name => "boards/vip/" + name);
  for (const asset of [...boards, "chess-duel.webp", "chess-becoming.webp"]) {
    const source = readFileSync(new URL("../public/" + asset, import.meta.url));
    assert.deepEqual(readFileSync(new URL("../dist/client/" + asset, import.meta.url)), source);
    assert.equal(source.toString("ascii", 8, 12), "WEBP");
    const original = readFileSync(new URL("../public/" + asset.replace(/\.webp$/, ".png"), import.meta.url));
    assert.ok(source.length < original.length * .25, asset);
  }
});
