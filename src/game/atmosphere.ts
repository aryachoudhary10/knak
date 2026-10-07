import * as THREE from "three";

/**
 * KNAK's day, as one continuous curve. Each key below is a moment the restaurant was "photographed" at;
 * every value between keys is blended on a smooth spline, so there is never a switch, only a drift.
 *
 *   06:00-08:00 dawn · 08:00-16:00 day · 16:00-18:00 golden hour · 18:00-19:30 blue hour
 *   19:30-23:00 evening · 23:00-02:00 late night · 02:00-06:00 night, the salon closed and dim
 *
 * Interior lights are in six groups, each with its own curve: 1 is the full evening level the room was lit for.
 */
export type LightGroup = "chandeliers" | "sconces" | "tableLamps" | "bar" | "ambient" | "exterior";

type Key = {
  h: number;
  /** sun height above the horizon in degrees (negative at night) */
  sunEl: number;
  /** directional light: the sun by day, faint moonlight by night */
  sun: number;
  sunColor: string;
  /** shadow edge softness, in shadow-map texels */
  shadowSoft: number;
  hemi: number;
  hemiSky: string;
  hemiGround: string;
  /** image-based light from the room's own reflections */
  env: number;
  // sky dome, from straight up to the horizon, plus the glow on the sun's side
  zenith: string;
  mid: string;
  horizon: string;
  glow: string;
  glowAmt: number;
  stars: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  // camera and grade
  exposure: number;
  /** warmth of the highlights in the grade, 1 = the evening grade */
  warm: number;
  /** coolness of the shadows in the grade */
  cool: number;
  /** strength of the film S-curve */
  contrast: number;
  bloom: number;
  // the six light groups
  chandeliers: number;
  sconces: number;
  tableLamps: number;
  bar: number;
  ambient: number;
  exterior: number;
  /** how much the window glass shows: reflections of the lit room at night, nearly clear by day */
  glass: number;
};

// prettier-ignore
const KEYS: Key[] = [
  // late night: the last tables, chandeliers lowered, street lamps on
  { h: 0,    sunEl: -40, sun: 0.12, sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.05, hemiSky: "#56648e", hemiGround: "#1a140e", env: 0.11, zenith: "#04060e", mid: "#080c1a", horizon: "#121828", glow: "#2a2030", glowAmt: 0,    stars: 0.9,  fog: "#121624", fogNear: 25, fogFar: 90,  exposure: 0.96, warm: 1,    cool: 1.1,  contrast: 0.42, bloom: 0.55, chandeliers: 0.6,  sconces: 0.85, tableLamps: 1,    bar: 1.05, ambient: 0.6,  exterior: 1,    glass: 0.22 },
  // night: closed, a few lights left on, very dark outside
  { h: 2,    sunEl: -35, sun: 0.1,  sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.04, hemiSky: "#4a587e", hemiGround: "#140f0b", env: 0.08, zenith: "#03040a", mid: "#060912", horizon: "#0d111d", glow: "#1a1824", glowAmt: 0,    stars: 1,    fog: "#0c0f18", fogNear: 22, fogFar: 85,  exposure: 0.9,  warm: 0.9,  cool: 1.3,  contrast: 0.44, bloom: 0.5,  chandeliers: 0.32, sconces: 0.4,  tableLamps: 0.25, bar: 0.35, ambient: 0.25, exterior: 0.9,  glass: 0.2 },
  { h: 4.5,  sunEl: -18, sun: 0.1,  sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.04, hemiSky: "#4a587e", hemiGround: "#140f0b", env: 0.08, zenith: "#03040a", mid: "#070a14", horizon: "#10131f", glow: "#1e1a28", glowAmt: 0,    stars: 1,    fog: "#0e1119", fogNear: 22, fogFar: 85,  exposure: 0.9,  warm: 0.85, cool: 1.3,  contrast: 0.44, bloom: 0.5,  chandeliers: 0.28, sconces: 0.35, tableLamps: 0.2,  bar: 0.3,  ambient: 0.22, exterior: 0.85, glass: 0.2 },
  // dawn: first grey-violet light, then peach on the horizon
  { h: 6,    sunEl: -6,  sun: 0.04, sunColor: "#a0a8d0", shadowSoft: 5,   hemi: 0.12, hemiSky: "#8a86ac", hemiGround: "#2a2018", env: 0.1,  zenith: "#141a36", mid: "#2c3460", horizon: "#6a5a78", glow: "#c98a7a", glowAmt: 0.5,  stars: 0.3,  fog: "#4a4258", fogNear: 25, fogFar: 95,  exposure: 0.92, warm: 0.8,  cool: 1.3,  contrast: 0.36, bloom: 0.45, chandeliers: 0.26, sconces: 0.3,  tableLamps: 0.2,  bar: 0.3,  ambient: 0.25, exterior: 0.7,  glass: 0.18 },
  { h: 6.6,  sunEl: 2,   sun: 0.7,  sunColor: "#ffae7e", shadowSoft: 4.5, hemi: 0.35, hemiSky: "#cdb4c0", hemiGround: "#3a2c20", env: 0.18, zenith: "#4a5f92", mid: "#8f8fb0", horizon: "#f0b9a0", glow: "#ffb07a", glowAmt: 0.9,  stars: 0,    fog: "#c8a6a0", fogNear: 30, fogFar: 105, exposure: 0.97, warm: 1.1,  cool: 1,    contrast: 0.32, bloom: 0.4,  chandeliers: 0.22, sconces: 0.22, tableLamps: 0.18, bar: 0.32, ambient: 0.3,  exterior: 0.35, glass: 0.14 },
  { h: 7.3,  sunEl: 10,  sun: 1.4,  sunColor: "#ffd2a6", shadowSoft: 3.5, hemi: 0.55, hemiSky: "#c8d0e4", hemiGround: "#3a2c20", env: 0.26, zenith: "#5f82bc", mid: "#a8bcd8", horizon: "#f2d6c0", glow: "#ffd0a0", glowAmt: 0.5,  stars: 0,    fog: "#d0c8cc", fogNear: 35, fogFar: 115, exposure: 1,    warm: 0.9,  cool: 0.8,  contrast: 0.3,  bloom: 0.36, chandeliers: 0.2,  sconces: 0.15, tableLamps: 0.15, bar: 0.38, ambient: 0.32, exterior: 0.12, glass: 0.1 },
  // day: bright neutral light, short crisp shadows, lamps barely on
  { h: 8.2,  sunEl: 22,  sun: 2.0,  sunColor: "#ffecd6", shadowSoft: 2.5, hemi: 0.75, hemiSky: "#c2d6ee", hemiGround: "#44362a", env: 0.34, zenith: "#4f85cc", mid: "#9cc0e4", horizon: "#d6e4ee", glow: "#fff0d8", glowAmt: 0.2,  stars: 0,    fog: "#c8d4de", fogNear: 40, fogFar: 130, exposure: 1,    warm: 0.6,  cool: 0.6,  contrast: 0.28, bloom: 0.3,  chandeliers: 0.16, sconces: 0.1,  tableLamps: 0.14, bar: 0.42, ambient: 0.32, exterior: 0.04, glass: 0.08 },
  { h: 12.5, sunEl: 68,  sun: 2.6,  sunColor: "#fffaf2", shadowSoft: 1.5, hemi: 0.9,  hemiSky: "#c4daf4", hemiGround: "#4a3a28", env: 0.4,  zenith: "#3f7cd0", mid: "#8db8e6", horizon: "#d4e3ef", glow: "#ffffff", glowAmt: 0.15, stars: 0,    fog: "#cdd8e2", fogNear: 40, fogFar: 135, exposure: 0.98, warm: 0.5,  cool: 0.5,  contrast: 0.28, bloom: 0.3,  chandeliers: 0.14, sconces: 0.1,  tableLamps: 0.14, bar: 0.45, ambient: 0.32, exterior: 0.03, glass: 0.08 },
  { h: 15.5, sunEl: 38,  sun: 2.4,  sunColor: "#fff0dc", shadowSoft: 2,   hemi: 0.8,  hemiSky: "#c8d8ea", hemiGround: "#4a3a28", env: 0.37, zenith: "#4a80c8", mid: "#98bce0", horizon: "#dce4e6", glow: "#fff0d8", glowAmt: 0.2,  stars: 0,    fog: "#d2d8dc", fogNear: 40, fogFar: 130, exposure: 1,    warm: 0.6,  cool: 0.6,  contrast: 0.3,  bloom: 0.3,  chandeliers: 0.16, sconces: 0.12, tableLamps: 0.16, bar: 0.48, ambient: 0.35, exterior: 0.04, glass: 0.08 },
  // golden hour: low orange sun raking through the windows, long shadows, the room's own lamps coming up
  { h: 16.6, sunEl: 22,  sun: 2.35, sunColor: "#ffd6a0", shadowSoft: 2.5, hemi: 0.62, hemiSky: "#dcd0c0", hemiGround: "#44301e", env: 0.3,  zenith: "#5a84c0", mid: "#a8bdd6", horizon: "#ecdcc4", glow: "#ffcf8e", glowAmt: 0.5,  stars: 0,    fog: "#ddcfbf", fogNear: 38, fogFar: 120, exposure: 1,    warm: 0.9,  cool: 0.7,  contrast: 0.36, bloom: 0.36, chandeliers: 0.32, sconces: 0.28, tableLamps: 0.3,  bar: 0.6,  ambient: 0.48, exterior: 0.1,  glass: 0.09 },
  { h: 17.4, sunEl: 10,  sun: 2.5,  sunColor: "#ffa556", shadowSoft: 3,   hemi: 0.45, hemiSky: "#e8c4a0", hemiGround: "#3a2618", env: 0.24, zenith: "#6683b4", mid: "#c2b4b4", horizon: "#ffc184", glow: "#ff9a48", glowAmt: 1,    stars: 0,    fog: "#e2b488", fogNear: 35, fogFar: 110, exposure: 1.02, warm: 1.25, cool: 0.7,  contrast: 0.44, bloom: 0.45, chandeliers: 0.45, sconces: 0.42, tableLamps: 0.5,  bar: 0.72, ambient: 0.6,  exterior: 0.25, glass: 0.1 },
  // sunset into blue hour: orange, pink and violet bands, the sun gone, the room warm against a cooling sky
  { h: 18,   sunEl: 1,   sun: 0.9,  sunColor: "#ff7a3e", shadowSoft: 4,   hemi: 0.3,  hemiSky: "#c8a0a8", hemiGround: "#2e2018", env: 0.2,  zenith: "#4d5a92", mid: "#b58a9a", horizon: "#ff9a5c", glow: "#ff7a3a", glowAmt: 1,    stars: 0,    fog: "#c48a78", fogNear: 32, fogFar: 105, exposure: 1,    warm: 1.2,  cool: 1,    contrast: 0.42, bloom: 0.48, chandeliers: 0.58, sconces: 0.6,  tableLamps: 0.68, bar: 0.82, ambient: 0.7,  exterior: 0.5,  glass: 0.13 },
  { h: 18.5, sunEl: -3,  sun: 0,    sunColor: "#c88aa0", shadowSoft: 5,   hemi: 0.2,  hemiSky: "#9a8ac0", hemiGround: "#241a1a", env: 0.17, zenith: "#2e3272", mid: "#8a5a8e", horizon: "#f08a72", glow: "#ff7a52", glowAmt: 0.8,  stars: 0,    fog: "#8a6278", fogNear: 30, fogFar: 100, exposure: 0.98, warm: 1,    cool: 1.4,  contrast: 0.4,  bloom: 0.5,  chandeliers: 0.7,  sconces: 0.78, tableLamps: 0.82, bar: 0.88, ambient: 0.78, exterior: 0.72, glass: 0.16 },
  { h: 19,   sunEl: -7,  sun: 0,    sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.13, hemiSky: "#6a74b0", hemiGround: "#1e1616", env: 0.15, zenith: "#1a2058", mid: "#3e3a7e", horizon: "#9a6a96", glow: "#c86a6a", glowAmt: 0.4,  stars: 0.05, fog: "#4a3e62", fogNear: 28, fogFar: 95,  exposure: 0.97, warm: 1,    cool: 1.6,  contrast: 0.4,  bloom: 0.52, chandeliers: 0.78, sconces: 0.88, tableLamps: 0.9,  bar: 0.92, ambient: 0.84, exterior: 0.88, glass: 0.18 },
  // evening: dinner service, everything at its full level, the street lamp-lit under a deep blue then black sky
  { h: 19.6, sunEl: -11, sun: 0.04, sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.09, hemiSky: "#4a5aa0", hemiGround: "#1a140e", env: 0.14, zenith: "#0e1640", mid: "#1c2a64", horizon: "#34467e", glow: "#5a4a7a", glowAmt: 0.15, stars: 0.3,  fog: "#26284a", fogNear: 27, fogFar: 92,  exposure: 0.98, warm: 1,    cool: 1.5,  contrast: 0.4,  bloom: 0.54, chandeliers: 0.88, sconces: 0.95, tableLamps: 0.96, bar: 0.96, ambient: 0.9,  exterior: 0.95, glass: 0.2 },
  { h: 21,   sunEl: -25, sun: 0.12, sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.05, hemiSky: "#44507e", hemiGround: "#1a140e", env: 0.13, zenith: "#05080f", mid: "#0a0f1e", horizon: "#151c30", glow: "#2a2438", glowAmt: 0,    stars: 0.85, fog: "#12162a", fogNear: 26, fogFar: 90,  exposure: 1,    warm: 1,    cool: 1.2,  contrast: 0.38, bloom: 0.55, chandeliers: 1,    sconces: 1,    tableLamps: 1,    bar: 1,    ambient: 0.9,  exterior: 1,    glass: 0.22 },
  { h: 23,   sunEl: -38, sun: 0.12, sunColor: "#8ea4d6", shadowSoft: 6,   hemi: 0.05, hemiSky: "#44507e", hemiGround: "#1a140e", env: 0.12, zenith: "#04060d", mid: "#080c18", horizon: "#121726", glow: "#2a2030", glowAmt: 0,    stars: 0.9,  fog: "#10141f", fogNear: 25, fogFar: 90,  exposure: 0.97, warm: 1,    cool: 1.1,  contrast: 0.4,  bloom: 0.55, chandeliers: 0.75, sconces: 0.95, tableLamps: 1,    bar: 1.05, ambient: 0.75, exterior: 1,    glass: 0.22 },
];

const NUMBERS = Object.keys(KEYS[0]).filter((k) => k !== "h" && typeof KEYS[0][k as keyof Key] === "number") as (keyof Key)[];
const COLORS = Object.keys(KEYS[0]).filter((k) => typeof KEYS[0][k as keyof Key] === "string") as (keyof Key)[];

// Colours are blended in linear light, which keeps sunsets from going muddy halfway.
const COLOR_KEYS = KEYS.map((k) => Object.fromEntries(COLORS.map((c) => [c, new THREE.Color(k[c] as string)])) as Record<string, THREE.Color>);

type Numbers = { [K in keyof Key as Key[K] extends number ? K : never]: number };
type Colors = { [K in keyof Key as Key[K] extends string ? K : never]: THREE.Color };

export type Atmosphere = Omit<Numbers, "h"> &
  Colors & {
    hour: number;
    /** unit vector toward the sun, or toward the moon once the sun is well down */
    dir: THREE.Vector3;
    /** unit vector toward the sun itself, for the sky's glow (below the horizon at night) */
    sunDir: THREE.Vector3;
  };

export function createAtmosphere(): Atmosphere {
  const a = { hour: 0, dir: new THREE.Vector3(), sunDir: new THREE.Vector3() } as Atmosphere;
  for (const c of COLORS) (a as unknown as Record<string, THREE.Color>)[c] = new THREE.Color();
  return a;
}

/** Centripetal-free, uniform Catmull-Rom: smooth through every key with no pause at any of them. */
function spline(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const MOON = new THREE.Vector3(-12, 9, 16).normalize();
const N = KEYS.length;
const hourOf = (i: number) => KEYS[((i % N) + N) % N].h + 24 * Math.floor(i / N);

/** Fill `out` with KNAK's atmosphere at a given hour (0-24, fractions allowed). */
export function sampleAtmosphere(hour: number, out: Atmosphere) {
  const h = ((hour % 24) + 24) % 24;
  let i = N - 1;
  for (let k = 0; k < N - 1; k++) {
    if (h >= KEYS[k].h && h < KEYS[k + 1].h) {
      i = k;
      break;
    }
  }
  const h1 = hourOf(i);
  const h2 = hourOf(i + 1);
  const t = (h < h1 ? h + 24 - h1 : h - h1) / (h2 - h1);
  const idx = (j: number) => ((j % N) + N) % N;
  const [k0, k1, k2, k3] = [idx(i - 1), idx(i), idx(i + 1), idx(i + 2)];
  const o = out as unknown as Record<string, number>;
  for (const f of NUMBERS) {
    const v = spline(KEYS[k0][f] as number, KEYS[k1][f] as number, KEYS[k2][f] as number, KEYS[k3][f] as number, t);
    // Light levels never dip below what both neighbouring keys allow, so the spline can't overshoot into the negative.
    const lo = Math.min(KEYS[k1][f] as number, KEYS[k2][f] as number);
    const hi = Math.max(KEYS[k1][f] as number, KEYS[k2][f] as number);
    o[f] = f === "sunEl" ? v : THREE.MathUtils.clamp(v, lo, hi);
  }
  const oc = out as unknown as Record<string, THREE.Color>;
  for (const c of COLORS) {
    const [a, b, cc, d] = [COLOR_KEYS[k0][c], COLOR_KEYS[k1][c], COLOR_KEYS[k2][c], COLOR_KEYS[k3][c]];
    oc[c].setRGB(
      Math.max(0, spline(a.r, b.r, cc.r, d.r, t)),
      Math.max(0, spline(a.g, b.g, cc.g, d.g, t)),
      Math.max(0, spline(a.b, b.b, cc.b, d.b, t)),
    );
  }
  out.hour = h;
  // The sun rises on the left of the street, crosses in front of the facade and sets on the right,
  // so in the late afternoon it rakes in low through the right-hand windows.
  const az = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(((h - 12.5) / 6.5) * 105, -120, 120));
  const el = THREE.MathUtils.degToRad(out.sunEl);
  out.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  // Once the sun is well down the same light becomes a faint, high moon; the switch happens while it is dark.
  if (out.sunEl > -4) out.dir.copy(out.sunDir);
  else out.dir.copy(MOON);
  return out;
}

export type Phase = "night" | "dawn" | "day" | "golden" | "blue" | "evening" | "late";

export function phaseOf(h: number): Phase {
  if (h >= 2 && h < 6) return "night";
  if (h >= 6 && h < 8) return "dawn";
  if (h >= 8 && h < 16) return "day";
  if (h >= 16 && h < 18) return "golden";
  if (h >= 18 && h < 19.5) return "blue";
  if (h >= 19.5 && h < 23) return "evening";
  return "late";
}

/** The line under the clock, from the real hour, e.g. "The golden hour". */
export function moodFor(h: number) {
  switch (phaseOf(h)) {
    case "night":
      return "After hours";
    case "dawn":
      return "First light";
    case "day":
      if (h < 11.5) return "A slow morning";
      if (h < 14.5) return "Lunch in the salon";
      return "A quiet afternoon";
    case "golden":
      return "The golden hour";
    case "blue":
      return "Blue hour";
    case "evening":
      return h < 22 ? "Dinner service" : "A late supper";
    case "late":
      return "The last tables";
  }
}

/**
 * Lights and glowing materials in each group, so one driver can set them all each time the hour moves.
 * Every entry keeps its own full-evening intensity and is multiplied by its group's level.
 */
type Lamp = { group: LightGroup; light: THREE.Light; base: number };
type Glow = { group: LightGroup; mat: THREE.MeshStandardMaterial; base: number };

export const lightGroups = {
  levels: { chandeliers: 1, sconces: 1, tableLamps: 1, bar: 1, ambient: 1, exterior: 1 } as Record<LightGroup, number>,
  lamps: new Set<Lamp>(),
  glows: new Map<THREE.MeshStandardMaterial, Glow>(),
};

export function registerLamp(group: LightGroup, light: THREE.Light, base: number) {
  const entry = { group, light, base };
  lightGroups.lamps.add(entry);
  light.intensity = base * lightGroups.levels[group];
  return () => {
    lightGroups.lamps.delete(entry);
  };
}

/** A glowing material (lamp shade, bulb, flame, lit bottles) whose emissive strength follows a group. */
export function registerGlow(group: LightGroup, mat: THREE.MeshStandardMaterial) {
  const known = lightGroups.glows.get(mat);
  const base = known?.base ?? mat.emissiveIntensity;
  lightGroups.glows.set(mat, { group, mat, base });
  mat.emissiveIntensity = base * lightGroups.levels[group];
}

/** Ref callback for a lit bottle wall's material. */
export const barGlow = (mat: THREE.MeshStandardMaterial | null) => {
  if (mat) registerGlow("bar", mat);
};

export function applyGroups(a: Atmosphere) {
  const lv = lightGroups.levels;
  lv.chandeliers = a.chandeliers;
  lv.sconces = a.sconces;
  lv.tableLamps = a.tableLamps;
  lv.bar = a.bar;
  lv.ambient = a.ambient;
  lv.exterior = a.exterior;
  for (const l of lightGroups.lamps) l.light.intensity = l.base * lv[l.group];
  for (const g of lightGroups.glows.values()) g.mat.emissiveIntensity = g.base * lv[g.group];
}
