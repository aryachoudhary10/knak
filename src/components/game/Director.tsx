"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { setInsideAmount, setMuted, speak } from "@/game/audio";

const INTRO_SECONDS = 8.5;
const HOST_LINE =
  "Bonsoir, and welcome to KNAK! I'm Amélie. Please, take any table you like, or see Louis at the counter whenever you're ready to order.";
const CASHIER_LINE = "Bonsoir! Here is our carte. Everything is cooked fresh and sent out hot for delivery. Take your time.";

/** Amélie's welcome: she waves, speaks and the line appears as a subtitle. Also what "Speak" replays. */
export function greetGuest() {
  runtime.greetAt = runtime.now;
  const ms = speak(HOST_LINE, { prefer: "female", pitch: 1.1 });
  useGame.getState().say("Amélie", HOST_LINE, ms);
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
          const ms = speak(CASHIER_LINE, { prefer: "male", pitch: 0.95 });
          s.say("Louis", CASHIER_LINE, ms);
        }
        if (s.soundOn !== prev.soundOn) setMuted(!s.soundOn);
      }),
    [],
  );

  useFrame(({ clock }) => {
    runtime.now = clock.elapsedTime;
    const s = useGame.getState();

    if (s.phase === "playing" && s.intro) {
      if (start.current === null) start.current = clock.elapsedTime;
      const t = Math.min(1, (clock.elapsedTime - start.current) / INTRO_SECONDS);
      const k = ease(t);
      camera.position.copy(path.getPoint(k));
      look.lerpVectors(lookFrom, lookTo, ease(Math.min(1, t * 1.15)));
      camera.lookAt(look);
      if (t >= 1) s.endIntro();
      return;
    }
    start.current = s.intro ? start.current : null;

    const z = runtime.playerPos.z;
    setInsideAmount(THREE.MathUtils.clamp((1.5 - z) / 3, 0, 1));

    if (s.phase === "playing" && runtime.greetAt < 0 && z < 2.8 && Math.abs(runtime.playerPos.x) < 3) {
      greetGuest();
    }
  });

  return null;
}
