export type AudioChannel = "music" | "pickup" | "placement";
export type AudioSettings = { music: number; pickup: number; placement: number; musicEnabled: boolean };
export const DEFAULT_AUDIO: AudioSettings = { music: 35, pickup: 65, placement: 70, musicEnabled: true };

export function restoreAudio(raw: string | null): AudioSettings {
  const settings = { ...DEFAULT_AUDIO };
  try {
    const saved = JSON.parse(raw || "null");
    if (!saved || typeof saved !== "object") return settings;
    for (const channel of ["music", "pickup", "placement"] as const) {
      if (typeof saved[channel] === "number" && Number.isFinite(saved[channel])) settings[channel] = Math.round(Math.max(0, Math.min(100, saved[channel])));
    }
    if (typeof saved.musicEnabled === "boolean") settings.musicEnabled = saved.musicEnabled;
  } catch { /* Use comfortable defaults if device preferences are damaged. */ }
  return settings;
}

const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
// Original eight-bar café progression, voiced above a walking upright bass.
const bars = [
  { chord: [53, 60, 64, 69], bass: [38, 45, 48, 49], melody: [76, 72, 69, 72] },
  { chord: [53, 59, 64, 69], bass: [43, 47, 50, 51], melody: [74, 71, 69, 67] },
  { chord: [52, 59, 62, 67], bass: [36, 43, 47, 48], melody: [72, 74, 76, 79] },
  { chord: [55, 61, 64, 70], bass: [33, 40, 43, 37], melody: [76, 73, 70, 69] },
  { chord: [53, 60, 64, 69], bass: [38, 41, 45, 46], melody: [77, 76, 72, 69] },
  { chord: [53, 59, 64, 69], bass: [43, 50, 47, 37], melody: [74, 76, 71, 69] },
  { chord: [52, 57, 59, 64], bass: [36, 40, 43, 45], melody: [72, 71, 67, 64] },
  { chord: [55, 61, 64, 70], bass: [33, 40, 37, 36], melody: [69, 70, 73, 76] },
];

export class ChessAudio {
  private context: AudioContext | null = null;
  private gains: Record<AudioChannel, GainNode> | null = null;
  private settings: AudioSettings = { ...DEFAULT_AUDIO };
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private hidden = false;
  private disposed = false;
  private noise: AudioBuffer | null = null;

  configure(settings: AudioSettings) {
    this.settings = { ...settings };
    if (this.context && this.gains) {
      for (const channel of ["music", "pickup", "placement"] as const) {
        const value = channel === "music" && !settings.musicEnabled ? 0 : settings[channel] / 100;
        this.gains[channel].gain.setTargetAtTime(value * (channel === "music" ? .38 : 1), this.context.currentTime, .035);
      }
    }
    this.syncMusic();
  }

  async unlock() {
    if (this.disposed || this.hidden) return false;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gains = { music: this.context.createGain(), pickup: this.context.createGain(), placement: this.context.createGain() };
        for (const gain of Object.values(this.gains)) gain.connect(this.context.destination);
        const delay = this.context.createDelay(.5), feedback = this.context.createGain(), warmth = this.context.createBiquadFilter();
        delay.delayTime.value = .21; feedback.gain.value = .13;
        warmth.type = "lowpass"; warmth.frequency.value = 2400;
        this.gains.music.connect(delay); delay.connect(warmth).connect(feedback);
        feedback.connect(delay); feedback.connect(this.context.destination);
        this.configure(this.settings);
      }
      if (this.context.state === "suspended") await this.context.resume();
      if (this.disposed || this.hidden) return false;
      this.syncMusic();
      return this.context.state === "running";
    } catch { return false; }
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.stopMusic();
    if (hidden) void this.context?.suspend().catch(() => {});
    else if (this.context) void this.unlock();
  }

  effect(channel: "pickup" | "placement", capture = false) {
    if (!this.context || !this.gains || this.disposed || this.hidden || this.settings[channel] === 0) return;
    const time = this.context.currentTime + .005;
    const output = this.gains[channel];
    if (channel === "pickup") {
      this.tone(640, time, .14, .065, output, "sine", 1020);
      this.tone(1280, time + .016, .15, .018, output);
      this.brush(time, .07, .023, 1700, output);
    } else {
      this.tone(capture ? 220 : 300, time, .16, .15, output, "sine", 105);
      this.tone(570, time + .008, .12, .037, output);
      this.brush(time, .065, .06, 900, output);
      if (capture) this.tone(880, time + .035, .2, .025, output);
    }
  }

  private syncMusic() {
    if (!this.context || !this.gains || this.context.state !== "running" || this.hidden || this.disposed || !this.settings.musicEnabled || this.settings.music === 0) {
      this.stopMusic(); return;
    }
    if (this.timer) return;
    this.nextBeat = this.context.currentTime + .08;
    const schedule = () => {
      if (!this.context || this.context.state !== "running") return;
      if (this.nextBeat < this.context.currentTime) this.nextBeat = this.context.currentTime + .05;
      while (this.nextBeat < this.context.currentTime + .22) {
        this.jazzBeat(this.nextBeat, this.beat++);
        this.nextBeat += 60 / 76;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 100);
  }

  private stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  private jazzBeat(time: number, beat: number) {
    const output = this.gains!.music;
    const bar = bars[Math.floor(beat / 4) % bars.length], position = beat % 4;
    const length = 60 / 76;
    if (position === 0 || position === 2) bar.chord.forEach((note, i) => {
      this.tone(hz(note), time + i * .018 + (position === 2 ? .045 : 0), 1.6, .036, output);
      this.tone(hz(note) * 2, time + i * .018, .65, .007, output);
    });
    this.tone(hz(bar.bass[position]), time, .65, .13, output);
    this.tone(hz(bar.bass[position]) * 2, time, .32, .02, output);
    if (position !== 1 || Math.floor(beat / 32) % 2 === 0) {
      this.tone(hz(bar.melody[position]), time + length * .12, .7, .037, output);
      if (position === 3) this.tone(hz(bar.melody[position] - 2), time + length * .68, .4, .018, output);
    }
    this.brush(time + .01, .14, .013, 4600, output);
    this.brush(time + length * .66, .08, .009, 5600, output);
    if (position === 1 || position === 3) this.brush(time, .25, .028, 1600, output);
  }

  private tone(frequency: number, time: number, duration: number, level: number, output: GainNode, type: OscillatorType = "sine", endFrequency?: number) {
    const context = this.context!;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration * .65);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + .009);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(envelope).connect(output);
    oscillator.start(time); oscillator.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  private brush(time: number, duration: number, level: number, cutoff: number, output: GainNode) {
    const context = this.context!;
    if (!this.noise) {
      this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = this.noise;
    filter.type = "bandpass"; filter.frequency.value = cutoff; filter.Q.value = .65;
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(level, time + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(envelope).connect(output);
    source.start(time); source.stop(time + duration + .01);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  dispose() {
    this.disposed = true;
    this.stopMusic();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.gains = null; this.noise = null;
  }
}
