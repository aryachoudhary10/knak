"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { stairFloor } from "@/game/stairs";
import { chairTakenLive, peers } from "@/game/live";
import { openChat, useChat } from "@/game/chat";
import { CHAIRS, CHAIR_BY_ID, COUNTER, COUNTER_SPOT, OCCUPIED_CHAIRS, SPAWN, STAFF, TABLES, tableInfo } from "@/game/layout";
import { greetGuest } from "./Director";

const HOST = STAFF.find((n) => n.id === "host")!;

const WALK = 3.0;
const RUN = 5.2;
// On phones a gentle stroll: the thumb stick makes full speed too easy to reach, and the room is meant to be savoured.
const TOUCH_WALK = 1.6;
const TOUCH_RUN = 2.4;
const FOOT = 0.85; // capsule centre above the soles
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
  if (s.phase !== "playing" || s.menuOpen || s.intro || useChat.getState().open) return;
  if (s.seatedChairId) {
    s.stand();
    return;
  }
  const p = s.prompt;
  if (!p) return;
  if (p.kind === "sit") s.sit(p.chairId);
  if (p.kind === "speak") greetGuest();
  if (p.kind === "whisper") {
    openChat(`w:${p.peerId}`, p.title);
    if (document.pointerLockElement) document.exitPointerLock();
  }
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
  // What the camera actually shows: eased toward the input so turns and steps glide like a camera on a gimbal.
  const view = useRef({ yaw: 0, pitch: 0, roll: 0, vx: 0, vz: 0, ready: false });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyE" && !e.repeat) interact();
      if (e.code === "Escape") {
        useGame.getState().closeMenu();
        useChat.setState({ open: false });
      }
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

    // Safety net: a long first frame (the browser compiling shaders) can push the body through the ground.
    if (rb.translation().y < -1) {
      rb.setTranslation(SPAWN, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    const yaw = s.yaw;
    const pitch = s.pitch;
    const cam = view.current;
    if (!cam.ready || s.intro) {
      cam.yaw = yaw;
      cam.pitch = pitch;
      cam.ready = true;
    }
    // Ease the view toward the input. Sitting down turns slowly; mouse and touch stay responsive.
    const turnRate = s.seatedChairId ? 6 : 22;
    const prevYaw = cam.yaw;
    cam.yaw = THREE.MathUtils.damp(cam.yaw, yaw, turnRate, dt);
    cam.pitch = THREE.MathUtils.damp(cam.pitch, pitch, turnRate, dt);

    if (s.seatedChairId) {
      const c = CHAIR_BY_ID[s.seatedChairId];
      camera.position.set(c.x, SEATED_EYE, c.z);
      runtime.playerPos.set(c.x, 0.9, c.z);
    } else {
      const chatting = useChat.getState().open;
      const canMove = s.phase === "playing" && !s.menuOpen && !s.intro && !chatting;
      const mx = canMove ? s.move.x : 0;
      const my = canMove ? s.move.y : 0;
      const len = Math.hypot(mx, my);
      const walk = s.isTouch ? TOUCH_WALK : WALK;
      const speed = s.running ? (s.isTouch ? TOUCH_RUN : RUN) : walk;
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
      // Ease into and out of walking instead of starting and stopping dead.
      const accel = len > 0.05 ? 9 : 12;
      cam.vx = THREE.MathUtils.damp(cam.vx, vx, accel, dt);
      cam.vz = THREE.MathUtils.damp(cam.vz, vz, accel, dt);
      vx = cam.vx;
      vz = cam.vz;
      const v = rb.linvel();
      // On the round staircase, follow the treads directly: a capsule can't climb a turning flight on its own.
      const at = rb.translation();
      const foot = at.y - FOOT;
      const tread = stairFloor(at.x, at.z, foot);
      const vy = tread === null ? v.y : THREE.MathUtils.clamp((tread - foot) * 14, -4, 4);
      rb.setLinvel({ x: vx, y: vy, z: vz }, true);

      const p = rb.translation();
      runtime.playerPos.set(p.x, p.y, p.z);
      // A gentle step rhythm that fades in with speed, plus a slow breath when standing still.
      const pace = Math.min(1, Math.hypot(vx, vz) / walk);
      bob.current += dt * (s.running ? 10 : 7.2) * pace;
      const bobY = Math.sin(bob.current * 2) * 0.018 * pace + Math.sin(runtime.now * 1.3) * 0.004;
      tmp.current.set(p.x + Math.cos(bob.current) * 0.012 * pace * Math.cos(yaw), p.y + EYE + bobY, p.z - Math.cos(bob.current) * 0.012 * pace * Math.sin(yaw));
      if (!s.intro && s.phase === "playing") camera.position.lerp(tmp.current, 1 - Math.exp(-dt * 30));
    }
    if (s.intro || s.phase !== "playing") return; // the Director flies the camera on the invitation and the arrival
    // Lean slightly into turns and sideways steps, like a handheld film camera.
    const turnSpeed = (cam.yaw - prevYaw) / Math.max(dt, 1e-3);
    const strafe = s.seatedChairId ? 0 : s.move.x;
    const rollTarget = THREE.MathUtils.clamp(turnSpeed * 0.012 - strafe * 0.012, -0.03, 0.03);
    cam.roll = THREE.MathUtils.damp(cam.roll, rollTarget, 5, dt);
    camera.rotation.set(cam.pitch, cam.yaw, cam.roll, "YXZ");

    // Find what the visitor is looking at.
    if (s.phase !== "playing" || s.menuOpen || useChat.getState().open) return;
    const anchor = (x: number, y: number, z: number) => (runtime.promptAnchor ??= new THREE.Vector3()).set(x, y, z);
    if (s.seatedChairId) {
      runtime.promptAnchor = null;
      s.setPrompt({ kind: "stand", ...tableInfo(s.seatedChairId), action: "Leave the table" });
      return;
    }
    const px = runtime.playerPos.x;
    const pz = runtime.playerPos.z;
    // Up in the gallery, the counter, host and dining tables below are out of reach.
    if (runtime.playerPos.y > 2.5) {
      runtime.promptAnchor = null;
      s.setPrompt(null);
      return;
    }
    const lookX = -Math.sin(yaw);
    const lookZ = -Math.cos(yaw);
    const toCounterX = COUNTER_SPOT.x - px;
    const toCounterZ = COUNTER_SPOT.z - pz;
    if (Math.abs(toCounterX) < 3.2 && Math.abs(toCounterZ) < 1.6 && lookZ < -0.3) {
      anchor(2.4, 1.5, COUNTER.z);
      s.setPrompt({ kind: "order", title: "The Counter", meta: "Louis · Maître de comptoir", action: "Explore the menu" });
      return;
    }
    const toHostX = HOST.x - px;
    const toHostZ = HOST.z - pz;
    const hostD = Math.hypot(toHostX, toHostZ);
    if (hostD < 2.4 && (toHostX * lookX + toHostZ * lookZ) / hostD > 0.6) {
      anchor(HOST.x - 0.45, 1.25, HOST.z);
      s.setPrompt({ kind: "speak", title: "Amélie", meta: "Your host", action: "Speak" });
      return;
    }
    // Another real guest close by and in front of you: offer a whisper.
    let near: { id: string; name: string; d: number; x: number; y: number; z: number } | null = null;
    for (const p of peers.values()) {
      const at = p.samples[p.samples.length - 1];
      if (!at || at.chair) continue;
      const dx = at.x - px;
      const dz = at.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > 2.2 || d < 0.01 || (dx * lookX + dz * lookZ) / d < 0.75) continue;
      if (!near || d < near.d) near = { id: p.id, name: p.name, d, x: at.x, y: at.y, z: at.z };
    }
    if (near) {
      anchor(near.x, near.y + 0.55, near.z);
      s.setPrompt({ kind: "whisper", peerId: near.id, title: near.name, meta: "Guest tonight", action: "Whisper" });
      return;
    }
    let best: { id: string; score: number } | null = null;
    for (const c of CHAIRS) {
      if (OCCUPIED_CHAIRS.has(c.id) || chairTakenLive(c.id)) continue;
      const dx = c.x - px;
      const dz = c.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > 1.7 || d < 0.01) continue;
      const dot = (dx * lookX + dz * lookZ) / d;
      if (dot < 0.55) continue;
      const score = dot - d * 0.3;
      if (!best || score > best.score) best = { id: c.id, score };
    }
    if (best) {
      const t = TABLES.find((tb) => tb.id === best.id.split("-")[0]);
      if (t) anchor(t.x, 1.05, t.z);
    }
    s.setPrompt(best ? { kind: "sit", chairId: best.id, ...tableInfo(best.id), action: "Take a seat" } : null);
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
      ccd
    >
      <CapsuleCollider args={[0.55, 0.3]} />
    </RigidBody>
  );
}
