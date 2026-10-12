import test from "node:test";
import assert from "node:assert/strict";
import { installVisualScheduling } from "../lib/visual-scheduling.ts";

test("picking up pieces does not freeze animation or reset the canvas; visibility and dialogs still pause it", () => {
  const doc = new EventTarget(), win = new EventTarget();
  doc.hidden = false;
  doc.documentElement = { dataset: {} };
  let dialogOpen = false, intersection, mutation, notifications = 0;
  const root = { querySelector: () => dialogOpen };
  doc.querySelector = selector => selector === ".site-shell" ? root : {};
  win.addEventListener("nuocco:visual-state", () => notifications++);
  const originals = new Map();
  for (const [name, value] of Object.entries({ document: doc, window: win,
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() {} },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() {} },
  })) { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, configurable: true }); }
  try {
    const dispose = installVisualScheduling();
    assert.equal(doc.documentElement.dataset.visualQuality, "balanced");
    assert.equal(doc.documentElement.dataset.visualPaused, "false");
    const started = notifications;
    for (let i = 0; i < 20; i++) {
      doc.dispatchEvent(new Event("pointerdown")); doc.dispatchEvent(new Event("pointerup"));
    }
    assert.equal(notifications, started, "pickup must not restart the canvas loop");
    assert.equal(doc.documentElement.dataset.visualPaused, "false");
    intersection([{ isIntersecting: false }]);
    assert.equal(doc.documentElement.dataset.visualPaused, "true");
    intersection([{ isIntersecting: true }]);
    assert.equal(doc.documentElement.dataset.visualPaused, "false");
    dialogOpen = true; mutation();
    assert.equal(doc.documentElement.dataset.visualPaused, "true");
    const covered = notifications; mutation();
    assert.equal(notifications, covered, "unchanged visibility must not dispatch another reset");
    dialogOpen = false; mutation(); doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(doc.documentElement.dataset.visualPaused, "true");
    dispose();
    assert.equal(doc.documentElement.dataset.visualPaused, undefined);
  } finally {
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});
