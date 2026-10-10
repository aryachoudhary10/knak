"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { FILM_SECONDS, FILM_TOUR } from "@/game/film";
import { addSample, peers } from "@/game/live";
import { useService } from "@/game/service";
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

/**
 * The feature reel, as separate shots with cuts between them (the app screens are spliced in at the cuts):
 * the street, the door and Amélie, down the room under the painted ceiling, the counter, a table shared with Nikita,
 * Théo bringing word of the order, a look across the full room, and back out to the street behind the closing title.
 */
const SEAT = { x: 2.3, z: -8.03 }; // chair D1-c0, across the table from Nikita in D1-c1
const TOUR: Key[][] = [
  [
    [0, [-0.9, 1.75, 21], [0, 2.7, 0]],
    [3.5, [0.1, 1.68, 9.5], [0, 2.4, 0]],
  ],
  [
    [3.5, [0.1, 1.68, 6.2], [0, 2.2, 0]],
    [5.4, [0.0, 1.66, 0.4], [-1.0, 1.75, -3.4]],
    [7.0, [-0.2, 1.64, -1.3], [-1.5, 1.68, -3.4]],
  ],
  [
    [7.0, [1.6, 1.7, -2.2], [-1.2, 1.9, -9]],
    [9.0, [1.1, 1.75, -5.0], [-0.6, 2.3, -11.6]],
    [11.0, [0.5, 1.72, -8.6], [0.3, 2.0, -15.6]],
  ],
  [
    [11.0, [-0.6, 1.66, -11.2], [0.3, 1.5, -15.6]],
    [14.0, [0.15, 1.62, -13.6], [0.55, 1.55, -15.9]],
  ],
  [
    [14.0, [SEAT.x + 0.45, 1.34, SEAT.z + 0.75], [SEAT.x, 1.12, SEAT.z - 1.95]],
    [18.0, [SEAT.x + 0.15, 1.26, SEAT.z + 0.3], [SEAT.x - 0.1, 1.1, SEAT.z - 1.95]],
  ],
  [
    [18.0, [SEAT.x + 0.05, 1.19, SEAT.z + 0.1], [SEAT.x - 1.6, 1.25, SEAT.z - 1.6]],
    [20.5, [SEAT.x, 1.18, SEAT.z], [SEAT.x - 1.4, 1.3, SEAT.z - 0.9]],
    [23.0, [SEAT.x + 0.1, 1.25, SEAT.z + 0.25], [SEAT.x - 0.5, 0.9, SEAT.z - 0.9]],
  ],
  [
    [23.0, [5.8, 2.3, -1.6], [-2.5, 1.3, -11.5]],
    [27.0, [4.6, 2.2, -2.6], [-3.0, 1.3, -12.5]],
  ],
  [
    [27.0, [0.2, 1.7, 8.5], [0, 3.2, 0]],
    [31.0, [0, 2.0, 16], [0, 3.6, 0]],
  ],
];
const SHOT_SET = FILM_TOUR ? TOUR : SHOTS;

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
      SHOT_SET.map((keys) => ({
        pos: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, "centripetal"),
        look: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, "centripetal"),
      })),
    [],
  );
  const at = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    useGame.setState({ phase: "playing", intro: false, soundOn: false });

    // The recorder renders frame n with __film.step(n / fps).
    Object.assign(window, { __film: { step: (t: number) => advance(t), seconds: FILM_SECONDS, line: () => useGame.getState().subtitle?.text ?? null } });
  }, [advance]);

  useFrame(({ clock, camera }) => {
    const t = Math.min(clock.elapsedTime, FILM_SECONDS);
    runtime.now = t;
    const s = useGame.getState();
    if (FILM_TOUR) {
      const shot = Math.max(0, SHOT_SET.findLastIndex((k) => t >= k[0][0]));
      pose(SHOT_SET[shot], t, false, shot === SHOT_SET.length - 1, curves[shot].pos, curves[shot].look, camera, at);
      tourEvents(t);
      return;
    }
    const shot = t < CUT ? 0 : 1;
    pose(SHOTS[shot], t, shot === 0, shot === SHOTS.length - 1, curves[shot].pos, curves[shot].look, camera, at);

    // Amélie's welcome while we pass her.
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

/** What happens on cue in the feature reel: who speaks, who sits where, and when Théo is sent with the news. */
const GUEST = "Ananya";
const WAITER_LINE = `${GUEST}, your order is ready! The Croque Monsieur is leaving our kitchen for your door now.`;
function tourEvents(t: number) {
  const s = useGame.getState();
  // Two other guests in the room, Nikita at our table and Rahul by the counter. They report in every frame, as a real
  // guest's browser would, or the room would take them for gone.
  addSample("film-nikita", "Nikita", { x: 2.3, y: 0.86, z: -9.97, yaw: 0, chair: "D1-c1" }, 4);
  addSample("film-rahul", "Rahul", { x: -1.4, y: 0.86, z: -13.4, yaw: Math.PI * 0.85, chair: null }, 1);
  const line = (who: "host" | "cashier", name: string, text: string, from: number, to: number) => {
    if (t >= from && t < to) {
      if (s.subtitle?.text !== text) s.say(who, name, text, 1e9);
      return true;
    }
    return false;
  };
  const talking =
    line("host", "Amélie", `Hi ${GUEST}! Welcome back to KNAK.`, 4.3, 7) ||
    line("cashier", "Louis", "Bonsoir! What can I get for you tonight?", 11.8, 14) ||
    (t >= 18 && t < 23 && s.subtitle?.who === "waiter");
  if (!talking && s.subtitle) useGame.setState({ subtitle: null });

  // From the table scene on we are seated across from Nikita, who has something to say.
  const seated = t >= 14 && t < 23;
  if (seated && s.seatedChairId !== "D1-c0") useGame.setState({ seatedChairId: "D1-c0" });
  if (!seated && s.seatedChairId) useGame.setState({ seatedChairId: null });
  const nikita = peers.get("film-nikita");
  if (nikita) nikita.said = t >= 15 && t < 18.4 ? { body: "You have to try the crème brûlée here!", until: performance.now() + 60000 } : undefined;

  // Théo sets off with the news while we chat, so he reaches the table during the next shot.
  if (t >= SEND_WAITER && t < 23 && !useService.getState().serving && !useService.getState().plateAt) {
    useService.setState({ serving: { id: "film", number: 142, dish: "Croque Monsieur", line: WAITER_LINE, clip: "waiter-ready-m3", at: t } });
  }
}
/** When Théo is sent; tuned so he arrives a moment into the serving shot. */
const SEND_WAITER = 14;

/** The closing title, drawn over the last two seconds. */
export function FilmCard() {
  if (FILM_TOUR) return null; // the feature reel's titles are laid over it in the edit
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
