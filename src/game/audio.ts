/**
 * Procedural ambience, generated in the browser so there are no audio files to download:
 * street rumble outside, a murmuring room with the odd clink of cutlery, soft piano chords,
 * and a door chime. Must be started from a user gesture (the Enter button).
 */

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  outside: GainNode;
  inside: GainNode;
  reverb: ConvolverNode;
};

let engine: Engine | null = null;
let muted = false;

function noiseBuffer(ctx: AudioContext, seconds: number, color: "brown" | "pink") {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === "brown") {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    }
  }
  return buf;
}

function impulse(ctx: AudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function loop(ctx: AudioContext, buf: AudioBuffer) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

/** One soft piano-like note: a few decaying partials. */
function note(e: Engine, freq: number, when: number, vel: number) {
  const { ctx } = e;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, when);
  out.gain.linearRampToValueAtTime(vel, when + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, when + 4.5);
  out.connect(e.inside);
  out.connect(e.reverb);
  [1, 2, 3, 4.01].forEach((h, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * h;
    const g = ctx.createGain();
    g.gain.value = [1, 0.35, 0.12, 0.05][i];
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + 4.6);
  });
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// A slow, café-style progression: Gmaj7 - Dmaj7 - Em9 - Cmaj7
const CHORDS = [
  [43, 59, 62, 66, 71],
  [38, 57, 61, 66, 69],
  [40, 59, 62, 66, 69],
  [36, 55, 59, 64, 67],
];

function schedulePiano(e: Engine) {
  let bar = 0;
  const barLen = 4.2;
  let next = e.ctx.currentTime + 0.5;
  const tick = () => {
    if (!engine) return;
    while (next < e.ctx.currentTime + 2) {
      const chord = CHORDS[bar % CHORDS.length];
      note(e, midi(chord[0]), next, 0.05);
      // gentle broken chord
      chord.slice(1).forEach((n, i) => note(e, midi(n), next + 0.35 + i * 0.42 + Math.random() * 0.05, 0.022));
      if (bar % 2 === 1) note(e, midi(chord[4] + 12), next + 2.6, 0.016);
      next += barLen;
      bar++;
    }
    setTimeout(tick, 500);
  };
  tick();
}

function scheduleClinks(e: Engine) {
  const clink = () => {
    if (!engine) return;
    const { ctx } = e;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 2400 + Math.random() * 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.012 + Math.random() * 0.012, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g);
    g.connect(e.inside);
    g.connect(e.reverb);
    o.start(t);
    o.stop(t + 0.4);
    setTimeout(clink, 1200 + Math.random() * 4500);
  };
  setTimeout(clink, 2000);
}

export function startAudio() {
  if (engine || typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  const outside = ctx.createGain();
  outside.gain.value = 1;
  outside.connect(master);
  const inside = ctx.createGain();
  inside.gain.value = 0.25;
  inside.connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(inside);
  engine = { ctx, master, outside, inside, reverb };

  // street rumble
  const rumble = loop(ctx, noiseBuffer(ctx, 6, "brown"));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const rg = ctx.createGain();
  rg.gain.value = 0.16;
  rumble.connect(lp).connect(rg).connect(outside);

  // room murmur: band-limited noise with slow swells
  const murmur = loop(ctx, noiseBuffer(ctx, 8, "pink"));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 520;
  bp.Q.value = 0.8;
  const mg = ctx.createGain();
  mg.gain.value = 0.22;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.17;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.07;
  lfo.connect(lfoGain).connect(mg.gain);
  lfo.start();
  murmur.connect(bp).connect(mg).connect(inside);

  schedulePiano(engine);
  scheduleClinks(engine);
}

/** 0 = on the street, 1 = inside the dining room. */
export function setInsideAmount(t: number) {
  if (!engine) return;
  const now = engine.ctx.currentTime;
  engine.inside.gain.setTargetAtTime(0.25 + 0.75 * t, now, 0.4);
  engine.outside.gain.setTargetAtTime(1 - 0.8 * t, now, 0.4);
}

export function doorChime() {
  if (!engine) return;
  const { ctx } = engine;
  const t = ctx.currentTime;
  [1318.5, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + i * 0.28);
    g.gain.linearRampToValueAtTime(0.06, t + i * 0.28 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.28 + 1.8);
    o.connect(g);
    g.connect(engine!.master);
    g.connect(engine!.reverb);
    o.start(t + i * 0.28);
    o.stop(t + i * 0.28 + 2);
  });
}

export function setMuted(m: boolean) {
  muted = m;
  if (engine) engine.master.gain.setTargetAtTime(m ? 0 : 0.9, engine.ctx.currentTime, 0.1);
  if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export function isMuted() {
  return muted;
}

/** Speak a line in a warm voice, if the browser has one. Returns roughly how long it will take (ms). */
export function speak(text: string, opts: { pitch?: number; rate?: number; prefer?: "female" | "male" } = {}) {
  const ms = Math.max(2500, text.length * 65);
  if (muted || typeof speechSynthesis === "undefined") return ms;
  const voices = speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const femaleHint = /female|samantha|victoria|karen|moira|serena|zira|susan|kate|fiona|google uk english female|aria|jenny|libby|sonia/i;
  const maleHint = /male|daniel|alex|arthur|george|guy|ryan|david|google uk english male/i;
  const hint = opts.prefer === "male" ? maleHint : femaleHint;
  const voice =
    english.find((v) => hint.test(v.name) && v.lang === "en-GB") ??
    english.find((v) => hint.test(v.name)) ??
    english.find((v) => v.lang === "en-GB") ??
    english[0];
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.95;
  u.pitch = opts.pitch ?? 1.05;
  u.volume = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return ms;
}
