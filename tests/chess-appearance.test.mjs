import test from "node:test";
import assert from "node:assert/strict";
import { ATMOSPHERES, BOARD_STYLES, STANDARD_BOARDS, VIP_BOARDS, COVER_SCENES, DEFAULT_VISUALS, restoreVisuals, realmBoardInset } from "../lib/chess-appearance.ts";
import { access } from "node:fs/promises";
import { assetUrl } from "../lib/asset-url.ts";
import { PIECE_SETS, pieceImage } from "../lib/chess-pieces.ts";

test("asset paths work at the domain root and under GitHub Pages without double prefixes", () => {
  for (const path of ["/pieces/sakura/wN.svg", "/chess-duel.png", "/boards/vip/dragon.png", "/covers/sakura.svg", "/og-v3.png"]) {
    assert.equal(assetUrl(path, ""), path);
    assert.equal(assetUrl(path, "/CoVuaHay"), "/CoVuaHay" + path);
    assert.equal(assetUrl(assetUrl(path, "/CoVuaHay"), "/CoVuaHay/"), "/CoVuaHay" + path);
  }
  for (const path of ["https://example.com/image.png", "//example.com/image.png", "data:image/svg+xml,test"]) {
    assert.equal(assetUrl(path, "/CoVuaHay"), path);
  }
});

test("all selectable pieces resolve to packaged files", async () => {
  for (const set of PIECE_SETS) {
    for (const color of ["w", "b"]) {
      for (const type of ["k", "q", "r", "b", "n", "p"]) {
        const image = pieceImage({ color, type }, set.id);
        assert.equal(image, `/pieces/${set.id}/${color}${type.toUpperCase()}.svg`);
        await access(new URL("../public" + image, import.meta.url));
      }
    }
  }
});

test("first visit starts with red sakura, sparks and cover movement", () => {
  assert.deepEqual(restoreVisuals(() => null), DEFAULT_VISUALS);
  assert.equal(DEFAULT_VISUALS.effect, "sakura");
  assert.equal(DEFAULT_VISUALS.particlesOn, true);
});
test("appearance preferences survive independently of saved games", () => {
  const saved = new Map([["nuocco:boardTheme", "lava"], ["nuocco:effect", "snow"], ["nuocco:cover", "frost"], ["nuocco:particles", "false"], ["nuocco:coverMotion", "false"]]);
  const game = { fen: "unchanged", moves: ["e4"], clock: 300000 };
  saved.set("nuocco:local:v2", JSON.stringify(game));
  assert.deepEqual(restoreVisuals(key => saved.get(key) ?? null), { boardTheme: "lava", effect: "snow", cover: "frost", particlesOn: true, motionOn: false });
  assert.deepEqual(JSON.parse(saved.get("nuocco:local:v2")), game);
});
test("old palettes migrate and invalid device preferences fall back safely", () => {
  for (const [old, current] of [["walnut", "royal"], ["midnight", "nebula"], ["crimson", "lava"], ["frost", "frost"]]) {
    assert.equal(restoreVisuals(key => key === "nuocco:boardTheme" ? old : null).boardTheme, current);
  }
  assert.deepEqual(restoreVisuals(() => "__invalid__"), DEFAULT_VISUALS);
  assert.equal(restoreVisuals(key => key === "nuocco:boardTheme" ? "__proto__" : null).boardTheme, "sakura");
});
test("every selectable appearance can be restored", () => {
  assert.equal(BOARD_STYLES.length, 12); assert.equal(STANDARD_BOARDS.length, 5); assert.equal(VIP_BOARDS.length, 7);
  assert.equal(ATMOSPHERES.length, 8); assert.equal(COVER_SCENES.length, 4);
  for (const [items, key, field] of [[BOARD_STYLES, "nuocco:boardTheme", "boardTheme"], [ATMOSPHERES, "nuocco:effect", "effect"], [COVER_SCENES, "nuocco:cover", "cover"]]) {
    for (const item of items) assert.equal(restoreVisuals(storedKey => storedKey === key ? item.id : null)[field], item.id);
  }
});

test("split realm art keeps white's realm and its grid margins on the correct side", () => {
  const splitBoards = VIP_BOARDS.filter(board => board.splitRealms);
  assert.equal(splitBoards.length, 2);
  for (const board of splitBoards) {
    const [top, right, bottom, left] = board.inset.split(" ");
    assert.equal(realmBoardInset(board.inset, "b"), board.inset);
    assert.equal(realmBoardInset(board.inset, "w"), [bottom, right, top, left].join(" "));
  }
});

test("VIP selections have packaged artwork and preserve game and other preferences", async () => {
  const saved = new Map([["nuocco:effect", "rain"], ["nuocco:cover", "nebula"], ["nuocco:local:v2", "saved-game"]]);
  for (const board of VIP_BOARDS) {
    await access(new URL("../public" + board.art, import.meta.url));
    saved.set("nuocco:boardTheme", board.id);
    const restored = restoreVisuals(key => saved.get(key) ?? null);
    assert.equal(restored.boardTheme, board.id);
    assert.equal(restored.effect, "rain");
    assert.equal(restored.cover, "nebula");
    assert.equal(saved.get("nuocco:local:v2"), "saved-game");
  }
});

test("legacy disabled effects stay visible and fall back to sakura without a saved selection", () => {
  const restored = restoreVisuals(key => key === "nuocco:particles" ? "false" : null);
  assert.equal(restored.particlesOn, true);
  assert.equal(restored.effect, "sakura");
  for (const effect of ATMOSPHERES) {
    const selected = restoreVisuals(key => key === "nuocco:particles" ? "false" : key === "nuocco:effect" ? effect.id : null);
    assert.equal(selected.particlesOn, true);
    assert.equal(selected.effect, effect.id);
  }
});
