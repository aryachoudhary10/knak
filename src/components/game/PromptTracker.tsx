"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { STAFF } from "@/game/layout";

/** Just above a standing person's head. */
const HEAD = 1.98;

/**
 * Pins the contextual prompt to the thing it is about: a hairline and dot beside Amélie, the counter or a table.
 * Written straight to the DOM each frame, so following the camera costs no React renders.
 */
export default function PromptTracker() {
  const v = useMemo(() => new THREE.Vector3(), []);
  const head = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    // The spoken line rides above the speaker's head, kept on screen, and fades out if they are behind you or far off.
    const speech = runtime.speechEl;
    const who = useGame.getState().subtitle?.who;
    const npc = who ? STAFF.find((n) => n.id === who) : undefined;
    if (speech && npc) {
      head.set(npc.x, (npc.y ?? 0) + HEAD, npc.z);
      const far = head.distanceTo(camera.position);
      head.project(camera);
      const half = Math.min(size.width * 0.36, 170) + 8;
      const x = THREE.MathUtils.clamp((head.x * 0.5 + 0.5) * size.width, half, size.width - half);
      const y = THREE.MathUtils.clamp((-head.y * 0.5 + 0.5) * size.height, 150, size.height - 40);
      speech.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      speech.style.opacity = head.z > 1 || far > 16 ? "0" : "1";
    } else if (speech) speech.style.opacity = "0";

    const el = runtime.promptEl;
    if (!el) return;
    const a = runtime.promptAnchor;
    if (!a) {
      el.dataset.mode = "center";
      el.style.transform = `translate3d(${size.width / 2}px, ${size.height * 0.84}px, 0)`;
      el.style.opacity = "1";
      return;
    }
    v.copy(a).project(camera);
    const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * size.width, 24, size.width - 24);
    const y = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * size.height, 90, size.height - 130);
    el.dataset.mode = "anchored";
    el.dataset.flip = x > size.width * 0.6 ? "1" : "0";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.opacity = v.z > 1 ? "0" : "1";
  });
  return null;
}
