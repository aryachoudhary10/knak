/**
 * Ambience for KNAK, generated in the browser: a slow late-night lounge / jazz bed
 * (FM Rhodes-style electric piano voicing maj9 / m9 / 13 chords, a soft upright-style bass,
 * the odd melody phrase), a smooth reverb, a faint deep city hush outside and a door chime.
 *
 * Real recording: the owner can drop a licensed track at `public/audio/lounge.mp3` (served as
 * `/audio/lounge.mp3`). If it exists it plays looped through the same inside/outside chain
 * instead of the procedural music; if not, nothing happens and the procedural music plays.
 *
 * Must be started from a user gesture (the Enter button).
 *
 * Signal chain:
 *   voices -> ep/bass/mel buses (+ reverb sends) -> musicFilter (lowpass, muffled outside)
 *   -> musicGain -> warm EQ (low-shelf, high-shelf cut, lowpass) -> compressor -> master -> out
 */

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  /** Final EQ input: everything audible goes through here. */
  eq: GainNode;
  musicFilter: BiquadFilterNode;
  musicGain: GainNode;
  hushGain: GainNode;
  roomGain: GainNode;
  reverb: ConvolverNode;
  epBus: GainNode;
  melBus: GainNode;
  bassBus: GainNode;
  /** False once a real recording has taken over. */
  procedural: boolean;
};

let engine: Engine | null = null;
let muted = false;

const MASTER_LEVEL = 0.8;
const BPM = 68;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Smooth stereo impulse: ~3 s exponential decay, progressively darker tail, short pre-delay. */
function impulse(ctx: AudioContext, seconds: number) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const pre = Math.floor(sr * 0.018);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let y = 0;
    for (let i = pre; i < len; i++) {
      const p = (i - pre) / (len - pre);
      const env = Math.exp(-6.9 * p) * Math.min(1, (i - pre) / (sr * 0.006));
      const a = 0.55 * (1 - 0.8 * p) + 0.04; // one-pole lowpass coefficient, closing over time
      y += a * (Math.random() * 2 - 1 - y);
      d[i] = y * env;
    }
  }
  return buf;
}

/** Seamlessly looping brown noise (ends crossfaded so the loop point doesn't click). */
function brownLoop(ctx: AudioContext, seconds: number) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.5);
  const raw = new Float32Array(len + fade);
  let last = 0;
  for (let i = 0; i < raw.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    raw[i] = last * 3.5;
  }
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = raw[i];
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    d[i] = raw[i] * w + raw[len + i] * (1 - w);
  }
  return buf;
}

function pan(ctx: AudioContext, value: number): AudioNode {
  if (typeof ctx.createStereoPanner !== "function") return ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, value));
  return p;
}

/**
 * One Rhodes-style note: sine carrier phase-modulated by a sine at the same frequency, with a
 * velocity-dependent index that decays quickly (the bark of the tine fading into a round tone).
 */
function epiano(e: Engine, n: number, when: number, dur: number, vel: number, dest: GainNode, bright = 1) {
  const { ctx } = e;
  const f = midi(n);
  const car = ctx.createOscillator();
  car.type = "sine";
  car.frequency.value = f;
  car.detune.value = rand(-4, 4);
  const mod = ctx.createOscillator();
  mod.type = "sine";
  mod.frequency.value = f;
  const index = ctx.createGain();
  // Index in Hz of deviation; lower for high notes so the top stays sweet.
  const idx = (0.5 + 1.3 * Math.min(1, vel / 0.06)) * bright * (n > 72 ? 0.7 : 1);
  index.gain.setValueAtTime(f * idx, when);
  index.gain.setTargetAtTime(f * idx * 0.1, when + 0.005, 0.35);
  mod.connect(index).connect(car.frequency);

  const amp = ctx.createGain();
  const peak = vel * rand(0.85, 1.12);
  const tau = Math.max(0.7, Math.min(2.2, 2.0 - (n - 48) * 0.035)); // low notes ring longer
  amp.gain.setValueAtTime(0, when);
  amp.gain.linearRampToValueAtTime(peak, when + 0.012);
  amp.gain.setTargetAtTime(0, when + 0.012, tau);
  const off = when + Math.max(0.15, dur);
  amp.gain.setTargetAtTime(0, off, 0.14);
  car.connect(amp).connect(pan(ctx, (n - 62) / 28)).connect(dest);

  const end = off + 1.1;
  car.start(when);
  mod.start(when);
  car.stop(end);
  mod.stop(end);
}

/** Soft round upright-ish bass: triangle through a plucked lowpass. */
function bass(e: Engine, n: number, when: number, dur: number, vel: number) {
  const { ctx } = e;
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.value = midi(n);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.6;
  lp.frequency.setValueAtTime(1000, when);
  lp.frequency.setTargetAtTime(240, when, 0.11);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, when);
  amp.gain.linearRampToValueAtTime(vel, when + 0.014);
  amp.gain.setTargetAtTime(0, when + 0.014, 0.9);
  const off = when + dur;
  amp.gain.setTargetAtTime(0, off, 0.07);
  o.connect(lp).connect(amp).connect(e.bassBus);
  o.start(when);
  o.stop(off + 0.6);
}

/**
 * Eight bars in F: Fmaj9 Dm9 Gm9 C13 | Am9 D9 Gm9 C13(b9). Each chord is [bass root, ...rootless
 * voicing] with smooth voice-leading in the middle register.
 */
const CHORDS: number[][] = [
  [41, 57, 60, 64, 67], // Fmaj9:  A C E G
  [38, 53, 57, 60, 64], // Dm9:    F A C E
  [43, 53, 57, 58, 62], // Gm9:    F A Bb D
  [36, 52, 57, 58, 62], // C13:    E A Bb D
  [45, 55, 59, 60, 64], // Am9:    G B C E
  [38, 54, 57, 60, 64], // D9:     F# A C E
  [43, 53, 57, 58, 62], // Gm9
  [36, 52, 57, 58, 61], // C13b9:  E A Bb Db
];

/** Comping rhythms, in beats: [start, length, velocity scale]. */
const COMPS: [number, number, number][][] = [
  [[0, 3.6, 1]],
  [[0, 1.9, 1], [2.6, 1.3, 0.7]],
  [[0, 0.9, 0.8], [1.6, 2.2, 1]],
  [[0, 2.4, 1], [3.3, 0.6, 0.55]],
];

function chord(e: Engine, notes: number[], when: number, dur: number, vel: number) {
  // Gentle roll from the bottom, humanised.
  notes.forEach((n, i) => epiano(e, n, when + i * rand(0.008, 0.02), dur, vel * rand(0.85, 1.05), e.epBus));
}

function melodyBar(e: Engine, voicing: number[], start: number) {
  const pool = Array.from(new Set(voicing.flatMap((n) => [n + 12, n + 24]).filter((n) => n >= 67 && n <= 84))).sort((a, b) => a - b);
  if (!pool.length) return;
  const slots = [0.6, 1, 1.6, 2, 2.6, 3];
  const count = 2 + Math.floor(Math.random() * 3);
  const picks = slots.filter(() => Math.random() < count / slots.length).slice(0, 4);
  if (!picks.length) picks.push(1.6);
  let idx = Math.floor(rand(0.3, 0.7) * pool.length);
  picks.forEach((b, i) => {
    const nextB = i + 1 < picks.length ? picks[i + 1] : 5;
    const dur = (nextB - b) * BEAT * 0.92;
    idx = Math.max(0, Math.min(pool.length - 1, idx + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 2)));
    epiano(e, pool[idx], start + b * BEAT + rand(-0.012, 0.012), dur, rand(0.03, 0.042), e.melBus, 1.15);
  });
}

function scheduleBar(e: Engine, bar: number, t0: number) {
  const c = CHORDS[bar % CHORDS.length];
  const next = CHORDS[(bar + 1) % CHORDS.length];
  const [root, ...voicing] = c;
  const h = () => rand(-0.012, 0.014);

  // Rhodes comping
  const comp = bar % 8 === 0 ? COMPS[0] : COMPS[Math.floor(Math.random() * COMPS.length)];
  comp.forEach(([b, len, v]) => chord(e, voicing, t0 + b * BEAT + h(), len * BEAT, 0.042 * v));

  // Bass: two-feel on root and fifth, sometimes a chromatic approach into the next bar.
  const fifth = root <= 40 ? root + 7 : root - 5;
  bass(e, root, t0 + h(), BEAT * 1.85, rand(0.14, 0.16));
  if (Math.random() < 0.35) {
    bass(e, fifth, t0 + 2 * BEAT + h(), BEAT * 1.3, rand(0.11, 0.13));
    bass(e, next[0] + (Math.random() < 0.5 ? -1 : 1), t0 + 3.5 * BEAT + h(), BEAT * 0.42, rand(0.08, 0.1));
  } else {
    bass(e, fifth, t0 + 2 * BEAT + h(), BEAT * 1.8, rand(0.11, 0.13));
  }

  // Occasional melody phrase, never in the first pass.
  if (bar >= 8 && Math.random() < 0.3) melodyBar(e, voicing, t0);
}

function scheduleMusic(e: Engine) {
  let bar = 0;
  let next = e.ctx.currentTime + 0.6;
  const tick = () => {
    if (!engine || !e.procedural) return;
    const now = e.ctx.currentTime;
    if (next < now) next = now + 0.1; // after throttling / suspension, skip ahead instead of piling up
    while (next < now + 1.2) {
      scheduleBar(e, bar, next);
      next += BAR;
      bar++;
    }
    setTimeout(tick, 250);
  };
  tick();
}

/** A very rare, very soft glass ting, only audible inside. */
function scheduleTings(e: Engine) {
  const ting = () => {
    if (!engine) return;
    const { ctx } = e;
    const t = ctx.currentTime + 0.05;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = rand(2900, 4200);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rand(0.003, 0.005), t + 0.006);
    g.gain.setTargetAtTime(0, t + 0.006, 0.12);
    o.connect(g).connect(e.roomGain);
    o.start(t);
    o.stop(t + 1);
    setTimeout(ting, rand(12000, 28000));
  };
  setTimeout(ting, 9000);
}

async function tryRecording(e: Engine) {
  try {
    const res = await fetch("/audio/lounge.mp3");
    if (!res.ok || (res.headers.get("content-type") ?? "").includes("text/html")) return;
    const buf = await e.ctx.decodeAudioData(await res.arrayBuffer());
    if (engine !== e) return;
    const now = e.ctx.currentTime;
    e.procedural = false;
    [e.epBus, e.melBus, e.bassBus].forEach((g) => g.gain.setTargetAtTime(0, now, 0.8));
    const src = e.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = e.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.45, now + 3);
    src.connect(g).connect(e.musicFilter);
    src.start(now);
  } catch {
    // no recording: keep the procedural music
  }
}

export function startAudio() {
  if (engine || typeof window === "undefined") return;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;

  // Master: warm EQ -> compressor -> mute/fade gain.
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  if (!muted) master.gain.setTargetAtTime(MASTER_LEVEL, now, 0.8);
  master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.02;
  comp.release.value = 0.35;
  comp.connect(master);
  const eq = ctx.createGain();
  const lowShelf = ctx.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = 180;
  lowShelf.gain.value = 2;
  const highShelf = ctx.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 5000;
  highShelf.gain.value = -6;
  const highCut = ctx.createBiquadFilter();
  highCut.type = "lowpass";
  highCut.frequency.value = 11000;
  highCut.Q.value = 0.5;
  eq.connect(lowShelf).connect(highShelf).connect(highCut).connect(comp);

  // Music: louder and open inside, muffled outside.
  const musicGain = ctx.createGain();
  musicGain.gain.value = 0.28;
  musicGain.connect(eq);
  const musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = 600;
  musicFilter.Q.value = 0.5;
  musicFilter.connect(musicGain);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 3);
  const wet = ctx.createGain();
  wet.gain.value = 0.32;
  reverb.connect(wet).connect(musicFilter);

  const send = (src: AudioNode, amount: number) => {
    const g = ctx.createGain();
    g.gain.value = amount;
    src.connect(g).connect(reverb);
  };

  // Electric piano bus: slow stereo tremolo + light chorus for width.
  const epBus = ctx.createGain();
  const trem = pan(ctx, 0);
  epBus.connect(trem).connect(musicFilter);
  if ("pan" in trem) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1.7;
    const depth = ctx.createGain();
    depth.gain.value = 0.22;
    lfo.connect(depth).connect((trem as StereoPannerNode).pan);
    lfo.start();
  }
  const chorus = ctx.createDelay(0.05);
  chorus.delayTime.value = 0.014;
  const cLfo = ctx.createOscillator();
  cLfo.frequency.value = 0.35;
  const cDepth = ctx.createGain();
  cDepth.gain.value = 0.0025;
  cLfo.connect(cDepth).connect(chorus.delayTime);
  cLfo.start();
  const chorusGain = ctx.createGain();
  chorusGain.gain.value = 0.35;
  epBus.connect(chorus).connect(chorusGain).connect(pan(ctx, 0.5)).connect(musicFilter);
  send(epBus, 0.3);

  const melBus = ctx.createGain();
  melBus.connect(musicFilter);
  melBus.connect(chorus);
  send(melBus, 0.45);

  const bassBus = ctx.createGain();
  bassBus.connect(musicFilter);
  send(bassBus, 0.06);

  // Outside: a faint, deep city hush (no hiss: low-passed hard).
  const hushGain = ctx.createGain();
  hushGain.gain.value = 0.035;
  hushGain.connect(eq);
  const hush = ctx.createBufferSource();
  hush.buffer = brownLoop(ctx, 6);
  hush.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 30;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 170;
  lp.Q.value = 0.5;
  hush.connect(hp).connect(lp).connect(hushGain);
  hush.start();

  // Inside-only room details.
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0;
  roomGain.connect(eq);
  send(roomGain, 0.5);

  engine = { ctx, master, eq, musicFilter, musicGain, hushGain, roomGain, reverb, epBus, melBus, bassBus, procedural: true };
  scheduleMusic(engine);
  scheduleTings(engine);
  void tryRecording(engine);
}

/** 0 = on the street, 1 = inside the dining room. */
export function setInsideAmount(t: number) {
  if (!engine) return;
  const k = Math.max(0, Math.min(1, t));
  const now = engine.ctx.currentTime;
  engine.musicFilter.frequency.setTargetAtTime(600 * Math.pow(30, k), now, 0.4);
  engine.musicGain.gain.setTargetAtTime(0.28 + 0.42 * k, now, 0.4);
  engine.hushGain.gain.setTargetAtTime(0.035 * (1 - k), now, 0.4);
  engine.roomGain.gain.setTargetAtTime(k, now, 0.4);
}

export function doorChime() {
  if (!engine) return;
  const e = engine;
  const { ctx } = e;
  const t = ctx.currentTime + 0.02;
  [1318.5, 1046.5].forEach((f, i) => {
    const s = t + i * 0.28;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.05, s + 0.01);
    g.gain.setTargetAtTime(0, s + 0.01, 0.35);
    o.connect(g);
    g.connect(e.eq);
    g.connect(e.reverb);
    o.start(s);
    o.stop(s + 2.5);
  });
}

export function setMuted(m: boolean) {
  muted = m;
  if (engine) engine.master.gain.setTargetAtTime(m ? 0 : MASTER_LEVEL, engine.ctx.currentTime, 0.1);
  if (m && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export function isMuted() {
  return muted;
}

/**
 * The staff's voices. A natural recorded-quality voice comes from /api/voice (Google's Indian English voices); when
 * that isn't set up or can't be reached, the browser's own voice speaks instead, choosing its most natural one.
 */
let naturalOff = false;
const clips = new Map<string, Promise<AudioBuffer | null>>();

function clip(text: string, who: "f" | "m") {
  const key = `${who}:${text}`;
  let p = clips.get(key);
  if (!p) {
    p = (async () => {
      if (naturalOff || !engine) return null;
      try {
        const res = await fetch(`/api/voice?v=${who}&t=${encodeURIComponent(text)}`);
        if (res.status === 404) naturalOff = true;
        if (!res.ok) return null;
        return await engine.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    clips.set(key, p);
    // A failed line can be tried again next time.
    void p.then((b) => b || clips.delete(key));
  }
  return p;
}

/** Fetch a line ahead of time, so it plays the instant it is needed. */
export function prepareLine(text: string, prefer: "female" | "male" = "female") {
  if (engine && !muted) void clip(text, prefer === "male" ? "m" : "f");
}

let playing: AudioBufferSourceNode | null = null;

/**
 * Phones only allow speech that starts from a tap. Called from the "Enter" tap: speaking a silent line there unlocks
 * the browser voice for the rest of the visit.
 */
export function unlockSpeech() {
  if (typeof speechSynthesis === "undefined") return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
    speechSynthesis.getVoices();
  } catch {}
}

/** Voice names that say who is speaking, across Windows, macOS, iOS, Android and Chrome. */
const FEMALE_VOICE = /female|woman|samantha|victoria|karen|moira|serena|zira|susan|kate|fiona|tessa|veena|isha|lekha|heera|neerja|kalpana|swara|aria|jenny|libby|sonia|hazel|ava|allison|zoe|nicky|kathy|vicki|flo|sandy|shelley|grandma|catherine|martha|emma|olivia|amelie|amélie/i;
const MALE_VOICE = /\bmale|\bman\b|daniel|alex\b|arthur|george|guy|ryan|david|mark\b|rishi|ravi|prabhat|madhur|hemant|aaron|fred|oliver|tom\b|evan|nathan|thomas|james|reed|rocko|eddy|grandpa|ralph|junior|albert|gordon|lee\b/i;

/**
 * The most natural-sounding English voice this browser has, preferring Indian English. Who is speaking comes first:
 * a woman's voice for Amélie even if a man's is more natural, so a voice named for the other gender is never chosen
 * while any other English voice exists.
 */
function bestVoice(prefer: "female" | "male") {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const [want, avoid] = prefer === "male" ? [MALE_VOICE, FEMALE_VOICE] : [FEMALE_VOICE, MALE_VOICE];
  // "Female" contains "male", so a female name only counts as male when nothing marks it as female.
  const isAvoid = (n: string) => (prefer === "male" ? avoid.test(n) : avoid.test(n) && !want.test(n));
  const score = (v: SpeechSynthesisVoice) =>
    (isAvoid(v.name) ? -40 : 0) +
    (want.test(v.name) && !(prefer === "male" && FEMALE_VOICE.test(v.name)) ? 14 : 0) +
    (/natural|neural|enhanced|premium|online/i.test(v.name) ? 8 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (v.lang.toLowerCase() === "en-in" ? 4 : v.lang.toLowerCase() === "en-gb" ? 2 : 0) +
    (v.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

function browserSpeak(text: string, opts: { pitch?: number; rate?: number; prefer?: "female" | "male" }) {
  if (typeof speechSynthesis === "undefined") return;
  // Phones list their voices a moment after the page asks; speaking before then uses the phone's default voice,
  // which is often a man's. Wait briefly for the list rather than risk Amélie speaking in the wrong voice.
  if (speechSynthesis.getVoices().length === 0) {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      speechSynthesis.removeEventListener("voiceschanged", go);
      say(text, opts);
    };
    speechSynthesis.addEventListener("voiceschanged", go);
    setTimeout(go, 900);
    return;
  }
  say(text, opts);
}

function say(text: string, opts: { pitch?: number; rate?: number; prefer?: "female" | "male" }) {
  const prefer = opts.prefer ?? "female";
  const u = new SpeechSynthesisUtterance(text);
  const voice = bestVoice(prefer);
  let pitch = opts.pitch ?? 1.02;
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
    // A voice whose name doesn't say who it is gets nudged toward the speaker's register.
    if (!(prefer === "male" ? MALE_VOICE : FEMALE_VOICE).test(voice.name)) pitch = prefer === "male" ? Math.min(pitch, 0.9) : Math.max(pitch, 1.2);
  } else if (prefer === "female") pitch = Math.max(pitch, 1.2);
  u.rate = opts.rate ?? 0.97;
  u.pitch = pitch;
  u.volume = 1;
  // Android drops a line spoken straight after cancel(), so only cancel when something is actually speaking.
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.speak(u), 80);
  } else speechSynthesis.speak(u);
}

/** Speak a line. Returns roughly how long it will take (ms), for the caption above the speaker. */
export function speak(text: string, opts: { pitch?: number; rate?: number; prefer?: "female" | "male" } = {}) {
  const ms = Math.max(2500, text.length * 65);
  if (muted) return ms;
  const e = engine;
  if (!e || naturalOff) {
    browserSpeak(text, opts);
    return ms;
  }
  void clip(text, opts.prefer === "male" ? "m" : "f").then((buf) => {
    if (muted) return;
    if (!buf) {
      browserSpeak(text, opts);
      return;
    }
    playing?.stop();
    const src = e.ctx.createBufferSource();
    src.buffer = buf;
    const g = e.ctx.createGain();
    g.gain.value = 1.1;
    src.connect(g).connect(e.ctx.destination);
    if (e.ctx.state === "suspended") void e.ctx.resume();
    src.start();
    playing = src;
  });
  return ms;
}
