"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { CHAIRS, CHAIR_BY_ID, COUNTER_SPOT, OCCUPIED_CHAIRS, SPAWN } from "@/game/layout";

const WALK = 3.0;
const RUN = 5.2;
const EYE = 0.75; // above capsule centre, so eyes sit at ~1.6 m
const SEATED_EYE = 1.18;

const keys = new Set<string>();

function syncKeys() {
  const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  const s = useGame.getState();
  s.setMove(r, f);
  s.setRunning(keys.has("ShiftLeft") || keys.has("ShiftRight"));
}

/** Run the current on-screen prompt: sit, stand, or open the menu. */
export function interact() {
  const s = useGame.getState();
  if (s.phase !== "playing" || s.menuOpen) return;
  if (s.seatedChairId) {
    s.stand();
    return;
  }
  const p = s.prompt;
  if (!p) return;
  if (p.kind === "sit") s.sit(p.chairId);
  if (p.kind === "order") {
    s.openMenu();
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

export default function Player() {
  const body = useRef<RapierRigidBody>(null);
  const camera = useThree((s) => s.camera);
  const bob = useRef(0);
  const seatedRef = useRef<string | null>(null);
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyE" && !e.repeat) interact();
      if (e.code === "Escape") useGame.getState().closeMenu();
      keys.add(e.code);
      syncKeys();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      syncKeys();
    };
    const blur = () => {
      keys.clear();
      syncKeys();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();

    // Sitting down and standing up.
    if (s.seatedChairId !== seatedRef.current) {
      if (s.seatedChairId) {
        const c = CHAIR_BY_ID[s.seatedChairId];
        rb.setEnabled(false);
        useGame.setState({ yaw: c.rot + Math.PI, pitch: -0.25 });
      } else if (seatedRef.current) {
        const c = CHAIR_BY_ID[seatedRef.current];
        rb.setTranslation({ x: c.x, y: 0.9, z: c.z }, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rb.setEnabled(true);
      }
      seatedRef.current = s.seatedChairId;
    }

    if (runtime.teleport) {
      rb.setTranslation(runtime.teleport, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      camera.position.set(runtime.teleport.x, runtime.teleport.y + EYE, runtime.teleport.z);
      runtime.teleport = null;
    }

    const yaw = s.yaw;
    const pitch = s.pitch;

    if (s.seatedChairId) {
      const c = CHAIR_BY_ID[s.seatedChairId];
      camera.position.set(c.x, SEATED_EYE, c.z);
      runtime.playerPos.set(c.x, 0.9, c.z);
    } else {
      const canMove = s.phase === "playing" && !s.menuOpen;
      const mx = canMove ? s.move.x : 0;
      const my = canMove ? s.move.y : 0;
      const len = Math.hypot(mx, my);
      const speed = s.running ? RUN : WALK;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      let vx = 0;
      let vz = 0;
      if (len > 0.05) {
        const k = (speed * Math.min(1, len)) / len;
        vx = (fwdX * my + rightX * mx) * k;
        vz = (fwdZ * my + rightZ * mx) * k;
      }
      const v = rb.linvel();
      rb.setLinvel({ x: vx, y: v.y, z: vz }, true);

      const p = rb.translation();
      runtime.playerPos.set(p.x, p.y, p.z);
      const moving = Math.hypot(vx, vz) > 0.1;
      bob.current += moving ? dt * (s.running ? 11 : 8) : 0;
      const bobY = moving ? Math.sin(bob.current) * 0.035 : 0;
      tmp.current.set(p.x, p.y + EYE + bobY, p.z);
      camera.position.lerp(tmp.current, 1 - Math.exp(-dt * 30));
    }
    camera.rotation.set(pitch, yaw, 0, "YXZ");

    // Find what the visitor is looking at.
    if (s.phase !== "playing" || s.menuOpen) return;
    if (s.seatedChairId) {
      s.setPrompt({ kind: "stand", label: "Stand up" });
      return;
    }
    const px = runtime.playerPos.x;
    const pz = runtime.playerPos.z;
    const lookX = -Math.sin(yaw);
    const lookZ = -Math.cos(yaw);
    const toCounterX = COUNTER_SPOT.x - px;
    const toCounterZ = COUNTER_SPOT.z - pz;
    if (Math.abs(toCounterX) < 3.2 && Math.abs(toCounterZ) < 1.6 && lookZ < -0.3) {
      s.setPrompt({ kind: "order", label: "Order at the counter" });
      return;
    }
    let best: { id: string; score: number } | null = null;
    for (const c of CHAIRS) {
      if (OCCUPIED_CHAIRS.has(c.id)) continue;
      const dx = c.x - px;
      const dz = c.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > 1.7 || d < 0.01) continue;
      const dot = (dx * lookX + dz * lookZ) / d;
      if (dot < 0.55) continue;
      const score = dot - d * 0.3;
      if (!best || score > best.score) best = { id: c.id, score };
    }
    s.setPrompt(best ? { kind: "sit", chairId: best.id, label: "Sit down" } : null);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[SPAWN.x, SPAWN.y, SPAWN.z]}
      enabledRotations={[false, false, false]}
      friction={0}
      linearDamping={0.5}
      canSleep={false}
    >
      <CapsuleCollider args={[0.55, 0.3]} />
    </RigidBody>
  );
}
