"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { FILM_SECONDS } from "@/game/film";
import { runtime } from "@/game/runtime";

type Key = [number, [number, number, number], [number, number, number]];

/**
 * Two shots, [time s, camera x y z, looking at x y z]. The street, through the doors past Amélie and down the room to
 * the counter; then, after a dip to black, a slow arc round the bottle tower in the bar salon under the closing title.
 */
const SHOTS: Key[][] = [
  [
    [0, [-0.9, 1.75, 21], [0, 2.7, 0]],
    [3.0, [0.1, 1.68, 9.5], [0, 2.4, 0]],
    [5.6, [0.0, 1.66, -0.8], [-1.3, 1.7, -3.4]],
    [7.8, [-0.9, 1.8, -6.8], [0.6, 2.2, -15.6]],
    [9.6, [2.3, 1.95, -11.6], [0.8, 2.0, -20]],
  ],
  [40, 22, 4, -14].map((deg, i): Key => {
    const a = (deg * Math.PI) / 180;
    return [9.6 + (i * (FILM_SECONDS - 9.6)) / 3, [0.8 + 2.9 * Math.sin(a), 1.72 - i * 0.04, -26.6 + 2.9 * Math.cos(a)], [0.8, 1.95 + i * 0.05, -26.6]];
  }),
];
const CUT = SHOTS[1][0][0];

function pose(keys: Key[], t: number, first: boolean, last: boolean, pos: THREE.CatmullRomCurve3, look: THREE.CatmullRomCurve3, cam: THREE.Camera, at: THREE.Vector3) {
  const times = keys.map((k) => k[0]);
  let i = times.findIndex((k, j) => j < times.length - 1 && t >= k && t <= times[j + 1]);
  if (i < 0) i = t < times[0] ? 0 : keys.length - 2;
  const local = THREE.MathUtils.clamp((t - times[i]) / (times[i + 1] - times[i]), 0, 1);
  let f = local;
  if (first && i === 0) f = 2 * local * local - local ** 3; // ease in from rest
  if (last && i === keys.length - 2) f = local + local ** 2 - local ** 3; // settle at the end
  const u = (i + f) / (keys.length - 1);
  cam.position.copy(pos.getPoint(u));
  cam.lookAt(look.getPoint(u, at));
}

/** Drives the camera through the film and fades the title card in at the end. */
export default function FilmDirector() {
  const advance = useThree((s) => s.advance);
  const curves = useMemo(
    () =>
      SHOTS.map((keys) => ({
        pos: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, "centripetal"),
        look: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, "centripetal"),
      })),
    [],
  );
  const at = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    useGame.setState({ phase: "playing", intro: false, soundOn: false });
    // The recorder renders frame n with __film.step(n / fps).
    Object.assign(window, { __film: { step: (t: number) => advance(t), seconds: FILM_SECONDS } });
  }, [advance]);

  useFrame(({ clock, camera }) => {
    const t = Math.min(clock.elapsedTime, FILM_SECONDS);
    runtime.now = t;
    const shot = t < CUT ? 0 : 1;
    pose(SHOTS[shot], t, shot === 0, shot === SHOTS.length - 1, curves[shot].pos, curves[shot].look, camera, at);

    // Amélie's welcome while we pass her.
    const s = useGame.getState();
    const greet = t > 4.4 && t < 7.4;
    if (greet && s.subtitle?.who !== "host") s.say("host", "Amélie", "Hi! Welcome to KNAK.", 1e9);
    if (!greet && s.subtitle) useGame.setState({ subtitle: null });

    const card = document.getElementById("film-card");
    if (card) card.style.opacity = String(THREE.MathUtils.clamp((t - (FILM_SECONDS - 2.6)) / 1.2, 0, 1));
    const dip = document.getElementById("film-dip");
    if (dip) dip.style.opacity = String(THREE.MathUtils.clamp(1 - Math.abs(t - CUT) / 0.4, 0, 1));
  });
  return null;
}

/** The closing title, drawn over the last two seconds. */
export function FilmCard() {
  return (
    <>
    <div id="film-dip" className="pointer-events-none absolute inset-0 z-40 bg-black opacity-0" />
    <div id="film-card" className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink/70 text-center text-ivory opacity-0">
      <p className="eyebrow text-[11px] text-champagne">Grand Café</p>
      <p className="mt-5 font-display text-[64px] leading-none tracking-[0.42em] pl-[0.42em]">KNAK</p>
      <p className="mt-6 max-w-[18rem] font-display text-[20px] italic leading-snug text-ivory/80">Walk in. Take a seat. Dinner comes to your door.</p>
      <p className="eyebrow mt-10 text-[11px] text-ivory/70">knak.vercel.app</p>
    </div>
    </>
  );
}
