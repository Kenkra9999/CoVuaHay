import test from "node:test";
import assert from "node:assert/strict";
import { ATMOSPHERES, BOARD_STYLES, COVER_SCENES, DEFAULT_VISUALS, restoreVisuals } from "../lib/chess-appearance.ts";

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
  assert.equal(BOARD_STYLES.length, 5); assert.equal(ATMOSPHERES.length, 8); assert.equal(COVER_SCENES.length, 4);
  for (const [items, key, field] of [[BOARD_STYLES, "nuocco:boardTheme", "boardTheme"], [ATMOSPHERES, "nuocco:effect", "effect"], [COVER_SCENES, "nuocco:cover", "cover"]]) {
    for (const item of items) assert.equal(restoreVisuals(storedKey => storedKey === key ? item.id : null)[field], item.id);
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
