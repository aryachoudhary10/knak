"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { SPAWN } from "@/game/layout";
import { peers } from "@/game/live";
import { runtime } from "@/game/runtime";
import { setInsideAmount, setMuted, speak } from "@/game/audio";
import { useAuth } from "@/game/auth";

const INTRO_SECONDS = 8.5;
/** KNAK is in India: guests are welcomed with Namaste at any hour. */
const salut = () => "Namaste";

/** Amélie greets a signed-in guest by the first name in their profile, anyone else warmly but generically. */
function hostLine() {
  const first = useAuth.getState().profile?.name.trim().split(/\s+/)[0];
  const rest = "I'm Amélie. Please, take any table you like, or see Louis at the counter whenever you're ready to order.";
  return first ? `${salut()}, ${first}! Welcome to KNAK. ${rest}` : `${salut()}, and welcome to KNAK! ${rest}`;
}
const cashierLine = () => `${salut()}! Here is our menu. Everything is cooked fresh and sent out hot for delivery. Take your time.`;

/** Amélie's welcome: she waves, speaks and the line appears above her head. Also what "Speak" replays. */
export function greetGuest() {
  runtime.greetAt = runtime.now;
  const HOST_LINE = hostLine();
  const ms = speak(HOST_LINE, { prefer: "female", pitch: 1.1 });
  useGame.getState().say("host", "Amélie", HOST_LINE, ms);
}

/** Places along the red carpet and pavement in front of the doors, nearest first. */
const ARRIVAL_SPOTS: [number, number][] = [
  [0, 0], [-1.1, 0.4], [1.1, 0.4], [-0.55, 1.3], [0.55, 1.3], [-1.9, 1.2], [1.9, 1.2], [0, 2.1], [-1.3, 2.3], [1.3, 2.3],
];

function freeArrivalSpot() {
  const taken = [...peers.values()].map((p) => p.samples[p.samples.length - 1]).filter(Boolean);
  for (const [dx, dz] of ARRIVAL_SPOTS) {
    const x = SPAWN.x + dx;
    const z = SPAWN.z + dz;
    if (taken.every((t) => Math.hypot(t.x - x, t.z - z) > 0.9)) return { x, z };
  }
  return { x: SPAWN.x + (Math.random() - 0.5) * 3.6, z: SPAWN.z + Math.random() * 2.4 };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Runs the cinematic arrival, the staff greetings and the inside/outside sound mix. */
export default function Director() {
  const camera = useThree((s) => s.camera);
  const start = useRef<number | null>(null);
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        // A walk across the road at eye height, so the arrival never looks like a drop from the sky.
        new THREE.Vector3(-0.8, 1.62, 21),
        new THREE.Vector3(0.9, 1.62, 15.5),
        new THREE.Vector3(0.4, 1.62, 11),
        new THREE.Vector3(0, 1.62, 7.5),
      ]),
    [],
  );
  const look = useMemo(() => new THREE.Vector3(), []);
  const arrival = useRef<{ x: number; z: number } | null>(null);
  const settleArrival = () => {
    const spot = freeArrivalSpot();
    arrival.current = spot;
    runtime.teleport = new THREE.Vector3(spot.x, SPAWN.y, spot.z);
  };
  const lookFrom = useMemo(() => new THREE.Vector3(0, 4.2, 0), []);
  const lookTo = useMemo(() => new THREE.Vector3(0, 1.95, 0), []);

  // Skip the intro with any key or click.
  useEffect(() => {
    const skip = () => {
      const s = useGame.getState();
      if (s.intro) s.endIntro();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  // Louis speaks the first time the menu opens.
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.menuOpen && !prev.menuOpen && runtime.cashierAt < 0) {
          runtime.cashierAt = runtime.now;
          const line = cashierLine();
          const ms = speak(line, { prefer: "male", pitch: 0.95 });
          s.say("cashier", "Louis", line, ms);
        }
        if (s.soundOn !== prev.soundOn) setMuted(!s.soundOn);
      }),
    [],
  );

  useFrame(({ clock }) => {
    runtime.now = clock.elapsedTime;
    const s = useGame.getState();

    // Behind the invitation: a slow, steady drift across the street in front of KNAK, as if waiting to cross.
    if (s.phase === "welcome") {
      const t = clock.elapsedTime;
      camera.position.set(-0.8 + Math.sin(t * 0.06) * 1.6, 1.62 + Math.sin(t * 0.11) * 0.04, 21 + Math.cos(t * 0.045) * 0.9);
      look.set(Math.sin(t * 0.05) * 0.4, lookFrom.y, 0);
      camera.lookAt(look);
      return;
    }

    if (s.phase === "playing" && s.intro) {
      if (start.current === null) {
        start.current = clock.elapsedTime;
        // Begin the walk from wherever the drift had reached, so the invitation flows straight into the arrival.
        path.points[0].copy(camera.position);
        path.points[path.points.length - 1].set(SPAWN.x, 1.62, SPAWN.z);
        path.updateArcLengths();
        arrival.current = null;
        lookFrom.copy(look);
      }
      const t = Math.min(1, (clock.elapsedTime - start.current) / INTRO_SECONDS);
      // Each guest ends the walk at a free spot on the carpet, so two people arriving together never stand inside
      // each other. The spot is chosen part-way in, once the other guests in the sitting are known, and the end of
      // the path eases over to it.
      if (t > 0.35 && !arrival.current) settleArrival();
      if (arrival.current) {
        const b = THREE.MathUtils.smoothstep(t, 0.35, 0.7);
        path.points[path.points.length - 1].set(THREE.MathUtils.lerp(SPAWN.x, arrival.current.x, b), 1.62, THREE.MathUtils.lerp(SPAWN.z, arrival.current.z, b));
        path.updateArcLengths();
      }
      const k = ease(t);
      camera.position.copy(path.getPoint(k));
      look.lerpVectors(lookFrom, lookTo, ease(Math.min(1, t * 1.15)));
      camera.lookAt(look);
      if (t >= 1) s.endIntro();
      return;
    }
    // Skipped the walk before a spot was chosen: choose it now.
    if (start.current !== null && !arrival.current) settleArrival();
    start.current = s.intro ? start.current : null;

    const z = runtime.playerPos.z;
    setInsideAmount(THREE.MathUtils.clamp((1.5 - z) / 3, 0, 1));

    if (s.phase === "playing" && runtime.greetAt < 0 && z < 2.8 && Math.abs(runtime.playerPos.x) < 3) {
      greetGuest();
    }
  });

  return null;
}
