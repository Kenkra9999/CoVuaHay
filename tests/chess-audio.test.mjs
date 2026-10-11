import test from "node:test";
import assert from "node:assert/strict";
import { ChessAudio, DEFAULT_AUDIO, restoreAudio } from "../lib/chess-audio.ts";

class Parameter {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}
class Node {
  gain = new Parameter(); frequency = new Parameter(); Q = new Parameter(); delayTime = new Parameter();
  connect(target) { return target; }
  disconnect() {}
  start() { this.context.sounds++; }
  stop() {}
}
function environment(t) {
  const contexts = [], timers = new Set();
  const original = globalThis.AudioContext;
  globalThis.AudioContext = class {
    state = "suspended"; currentTime = 1; sampleRate = 256; sounds = 0; gains = [];
    destination = new Node();
    constructor() { contexts.push(this); }
    createGain() { const node = new Node(); this.gains.push(node); return node; }
    createOscillator() { const node = new Node(); node.context = this; return node; }
    createBufferSource() { const node = new Node(); node.context = this; return node; }
    createBiquadFilter() { return new Node(); }
    createDelay() { return new Node(); }
    createBuffer(_, length) { return { getChannelData: () => new Float32Array(length) }; }
    async resume() { this.state = "running"; }
    async suspend() { this.state = "suspended"; }
    async close() { this.state = "closed"; }
  };
  t.mock.method(globalThis, "setInterval", callback => { timers.add(callback); return callback; });
  t.mock.method(globalThis, "clearInterval", callback => { timers.delete(callback); });
  t.after(() => { if (original) globalThis.AudioContext = original; else delete globalThis.AudioContext; });
  return { contexts, timers };
}

test("invalid saved settings cannot produce excessive volume; all three preferences restore independently", () => {
  assert.deepEqual(restoreAudio("broken"), DEFAULT_AUDIO);
  assert.deepEqual(restoreAudio('{"music":250,"pickup":-8,"placement":42.5,"musicEnabled":false}'), { music: 100, pickup: 0, placement: 43, musicEnabled: false });
  assert.deepEqual(restoreAudio('{"music":"loud","pickup":null}'), DEFAULT_AUDIO);
});

test("no autoplay before a gesture, and repeated gestures never duplicate the music scheduler", async t => {
  const { contexts, timers } = environment(t), audio = new ChessAudio();
  audio.configure(DEFAULT_AUDIO);
  assert.equal(contexts.length, 0);
  await audio.unlock(); await audio.unlock(); await audio.unlock();
  assert.equal(contexts.length, 1);
  assert.equal(timers.size, 1);
  assert.ok(contexts[0].sounds > 0);
  audio.dispose();
  assert.equal(timers.size, 0);
  assert.equal(contexts[0].state, "closed");
  assert.equal(await audio.unlock(), false);
});

test("muting one effect leaves the other effect and café music available", async t => {
  const { contexts, timers } = environment(t), audio = new ChessAudio();
  audio.configure({ ...DEFAULT_AUDIO, pickup: 0, placement: 80 });
  await audio.unlock();
  const context = contexts[0], before = context.sounds;
  audio.effect("pickup");
  assert.equal(context.sounds, before);
  audio.effect("placement");
  assert.ok(context.sounds > before);
  assert.equal(timers.size, 1);
  assert.equal(context.gains[1].gain.value, 0);
  assert.equal(context.gains[2].gain.value, .8);
  audio.configure({ ...DEFAULT_AUDIO, musicEnabled: false });
  assert.equal(timers.size, 0);
  assert.equal(context.gains[0].gain.value, 0);
  const mutedMusic = context.sounds;
  audio.effect("pickup");
  assert.ok(context.sounds > mutedMusic);
  audio.dispose();
});

test("background tabs suspend audio; returning starts only one scheduler, and zero music volume stops it", async t => {
  const { contexts, timers } = environment(t), audio = new ChessAudio();
  await audio.unlock();
  audio.setHidden(true);
  assert.equal(timers.size, 0);
  assert.equal(contexts[0].state, "suspended");
  assert.equal(await audio.unlock(), false);
  const sounds = contexts[0].sounds;
  audio.effect("placement");
  assert.equal(contexts[0].sounds, sounds);
  audio.setHidden(false);
  await audio.unlock();
  assert.equal(timers.size, 1);
  audio.configure({ ...DEFAULT_AUDIO, music: 0 });
  assert.equal(timers.size, 0);
  audio.dispose();
});
