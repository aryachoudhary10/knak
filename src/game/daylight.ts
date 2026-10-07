import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * KNAK keeps Indian time: the street outside is bright at noon, gold in the late afternoon and lamp-lit at night,
 * following the clock in India (UTC+5:30) wherever the guest is. `?hour=13.5` in the address previews any hour.
 */
export function indiaHour(now = new Date()) {
  const override = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("hour") : null;
  if (override !== null && !Number.isNaN(Number(override))) return ((Number(override) % 24) + 24) % 24;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
  return (minutes % 1440) / 60;
}

/** The current Indian hour, refreshed every minute so the light drifts with the real day. */
export function useIndiaHour() {
  const [hour, setHour] = useState(() => indiaHour());
  useEffect(() => {
    const id = setInterval(() => setHour(indiaHour()), 60_000);
    return () => clearInterval(id);
  }, []);
  return hour;
}

type Key = {
  h: number;
  /** sun height above the horizon, degrees */
  sunEl: number;
  sun: number;
  sunColor: string;
  hemi: number;
  hemiSky: string;
  air: string;
  fog: string;
  env: number;
  /** how much the street's own lights count: lamps, lit windows, facade washes */
  lamps: number;
};

// A day in Paris light, keyed by hour.
const KEYS: Key[] = [
  { h: 0, sunEl: -20, sun: 0.35, sunColor: "#9fb6e0", hemi: 0.08, hemiSky: "#9db0d6", air: "#2a2230", fog: "#3a2c33", env: 0.13, lamps: 1 },
  { h: 5, sunEl: -10, sun: 0.35, sunColor: "#9fb6e0", hemi: 0.08, hemiSky: "#9db0d6", air: "#2a2230", fog: "#3a2c33", env: 0.13, lamps: 1 },
  { h: 6.2, sunEl: 2, sun: 0.7, sunColor: "#ffc39a", hemi: 0.3, hemiSky: "#c7b5c9", air: "#b89aa0", fog: "#c9a99f", env: 0.2, lamps: 0.6 },
  { h: 8, sunEl: 22, sun: 1.7, sunColor: "#ffeedb", hemi: 0.6, hemiSky: "#bcd2ec", air: "#a9c2dc", fog: "#c8d3dc", env: 0.3, lamps: 0.12 },
  { h: 12.5, sunEl: 62, sun: 2.3, sunColor: "#fffaf0", hemi: 0.8, hemiSky: "#c2d8f2", air: "#a6c3e2", fog: "#cdd8e2", env: 0.36, lamps: 0.08 },
  { h: 16, sunEl: 32, sun: 2.0, sunColor: "#fff0d6", hemi: 0.7, hemiSky: "#c4d6ea", air: "#b0c6dc", fog: "#d4d6d6", env: 0.32, lamps: 0.1 },
  { h: 17.8, sunEl: 7, sun: 1.5, sunColor: "#ffb06a", hemi: 0.45, hemiSky: "#e3c3a6", air: "#e2b48a", fog: "#d9a982", env: 0.24, lamps: 0.45 },
  { h: 18.7, sunEl: -2, sun: 0.45, sunColor: "#d6a3b8", hemi: 0.18, hemiSky: "#a99ac0", air: "#5a4458", fog: "#6a4c56", env: 0.16, lamps: 0.9 },
  { h: 19.6, sunEl: -12, sun: 0.35, sunColor: "#9fb6e0", hemi: 0.08, hemiSky: "#9db0d6", air: "#2a2230", fog: "#3a2c33", env: 0.13, lamps: 1 },
  { h: 24, sunEl: -20, sun: 0.35, sunColor: "#9fb6e0", hemi: 0.08, hemiSky: "#9db0d6", air: "#2a2230", fog: "#3a2c33", env: 0.13, lamps: 1 },
];

const ca = new THREE.Color();
const cb = new THREE.Color();
const mixColor = (a: string, b: string, t: number) => "#" + ca.set(a).lerp(cb.set(b), t).getHexString();

export type Daylight = Omit<Key, "h"> & {
  /** direction toward the sun (or the moon at night), unit length */
  dir: THREE.Vector3;
  /** sky dome sun position; below the horizon at night */
  sunPos: [number, number, number];
  night: boolean;
};

const MOON = new THREE.Vector3(-12, 9, 16).normalize();

export function daylight(hour: number): Daylight {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = THREE.MathUtils.smoothstep(hour, a.h, b.h);
  const n = (x: number, y: number) => x + (y - x) * t;
  const sunEl = n(a.sunEl, b.sunEl);
  // The sun crosses from the left of the street in the morning to the right in the evening, in front of the facade.
  const az = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(((hour - 12.5) / 6.5) * 105, -110, 110));
  const el = THREE.MathUtils.degToRad(sunEl);
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const up = sunEl > 1;
  return {
    sunEl,
    sun: n(a.sun, b.sun),
    sunColor: mixColor(a.sunColor, b.sunColor, t),
    hemi: n(a.hemi, b.hemi),
    hemiSky: mixColor(a.hemiSky, b.hemiSky, t),
    air: mixColor(a.air, b.air, t),
    fog: mixColor(a.fog, b.fog, t),
    env: n(a.env, b.env),
    lamps: n(a.lamps, b.lamps),
    // Shadows come from the sun by day; at night the old moonlight angle keeps its long soft shadows.
    dir: up ? sunDir : MOON.clone(),
    sunPos: [sunDir.x * 100, sunDir.y * 100, sunDir.z * 100],
    night: sunEl < -6,
  };
}
