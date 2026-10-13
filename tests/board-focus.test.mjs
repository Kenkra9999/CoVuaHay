import test from "node:test";
import assert from "node:assert/strict";
import { createBoardFocus } from "../lib/board-focus.ts";

function environment() {
  const doc = new EventTarget(), win = new EventTarget(), changes = [];
  doc.body = { style: { overflow: "auto" } };
  doc.fullscreenElement = null;
  doc.exits = 0;
  doc.exitFullscreen = async () => {
    doc.exits++;
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event("fullscreenchange"));
  };
  const root = { requestFullscreen: async () => {
    doc.fullscreenElement = root;
    doc.dispatchEvent(new Event("fullscreenchange"));
  } };
  return { doc, win, root, changes, controller: createBoardFocus(root, value => changes.push(value), doc, win) };
}

test("enter and exit native fullscreen restore the original page scrolling", async () => {
  const { doc, root, changes, controller } = environment();
  await controller.enter();
  assert.equal(doc.fullscreenElement, root);
  assert.equal(doc.body.style.overflow, "hidden");
  controller.exit();
  assert.equal(doc.fullscreenElement, null);
  assert.equal(doc.body.style.overflow, "auto");
  assert.deepEqual(changes, [true, false]);
  controller.dispose();
});

test("the browser's own Escape exit also leaves the large-board layout", async () => {
  const { doc, changes, controller } = environment();
  await controller.enter();
  await doc.exitFullscreen();
  assert.deepEqual(changes, [true, false]);
  assert.equal(doc.body.style.overflow, "auto");
  controller.dispose();
});

test("unsupported fullscreen keeps the fitted fallback and Escape still exits it", async () => {
  const { doc, win, root, changes, controller } = environment();
  delete root.requestFullscreen;
  await controller.enter();
  assert.deepEqual(changes, [true]);
  win.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
  assert.deepEqual(changes, [true, false]);
  assert.equal(doc.exits, 0);
  assert.equal(doc.body.style.overflow, "auto");
  controller.dispose();
});

test("a denied fullscreen request leaves an exit-able fallback without duplicate entry", async () => {
  const { root, changes, controller } = environment();
  let attempts = 0;
  root.requestFullscreen = async () => { attempts++; throw new Error("Denied"); };
  await controller.enter();
  await controller.enter();
  assert.equal(attempts, 1);
  assert.deepEqual(changes, [true]);
  controller.exit();
  assert.deepEqual(changes, [true, false]);
  controller.dispose();
});

test("exiting before a delayed native request completes cannot reopen fullscreen", async () => {
  const { doc, root, changes, controller } = environment();
  let finish;
  root.requestFullscreen = () => new Promise(resolve => { finish = () => {
    doc.fullscreenElement = root;
    doc.dispatchEvent(new Event("fullscreenchange"));
    resolve();
  }; });
  const pending = controller.enter();
  controller.exit();
  finish();
  await pending;
  assert.equal(doc.fullscreenElement, null);
  assert.deepEqual(changes, [true, false]);
  controller.dispose();
});

test("unmount restores scrolling and removes listeners without changing another fullscreen owner", async () => {
  const { doc, win, root, changes, controller } = environment();
  delete root.requestFullscreen;
  await controller.enter();
  const other = {};
  doc.fullscreenElement = other;
  controller.dispose();
  win.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
  doc.dispatchEvent(new Event("fullscreenchange"));
  assert.equal(doc.fullscreenElement, other);
  assert.equal(doc.exits, 0);
  assert.equal(doc.body.style.overflow, "auto");
  assert.deepEqual(changes, [true]);
});
