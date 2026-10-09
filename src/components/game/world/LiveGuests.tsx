"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { CHAIR_BY_ID } from "@/game/layout";
import {
  connectLive,
  disconnectLive,
  peers,
  publishSelf,
  setLiveName,
  useLive,
} from "@/game/live";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { useAuth } from "@/game/auth";
import { setTable, startChat, stopChat } from "@/game/chat";
import { startService, stopService } from "@/game/service";
import { GUEST_AVATARS, Human, type Clip } from "./Human";

/** Feet sit this far below the player's capsule centre (see Player). */
const FOOT = 0.85;

/** One other real guest: glides toward their latest reported spot, walks while moving, sits when seated. */
function RemoteGuest({ id }: { id: string }) {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const label = useRef<HTMLDivElement>(null);
  const said = useRef<HTMLDivElement>(null);
  const state = useRef({ speed: 0, seated: false, placed: false });
  const target = useMemo(() => new THREE.Vector3(), []);
  const peer = peers.get(id);
  const chosen = useLive((s) => s.looks[id]);
  const look = chosen ?? peer?.look ?? 0;
  const avatar = GUEST_AVATARS[look % GUEST_AVATARS.length];

  useFrame(({ camera }, dt) => {
    const g = ref.current;
    const p = peers.get(id);
    if (!g || !p) return;
    const s = p.samples[p.samples.length - 1];
    if (!s) return;
    const st = state.current;
    const chair = s.chair ? CHAIR_BY_ID[s.chair] : undefined;
    st.seated = !!chair;
    if (chair) target.set(chair.x, 0, chair.z);
    else target.set(s.x, s.y - FOOT, s.z);
    const dist = g.position.distanceTo(target);
    if (!st.placed || dist > 4) {
      // First sight, or a jump (sat down across the room, came back to the tab): appear there directly.
      g.position.copy(target);
      st.placed = true;
      st.speed = 0;
    } else {
      // Cover the gap in about one update interval, so walking reads as continuous between messages.
      const step = Math.min(dist, Math.max(dist * Math.min(1, dt / 0.36), 0));
      if (dist > 1e-4) g.position.lerp(target, step / dist);
      st.speed = THREE.MathUtils.damp(st.speed, dt > 0 ? step / dt : 0, 8, dt);
    }
    // Face where they are looking (the camera yaw looks down -z; the model faces +z).
    const want = chair ? chair.rot : s.yaw + Math.PI;
    const cur = g.rotation.y;
    g.rotation.y =
      cur +
      Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) *
        Math.min(1, dt * 8);

    // A solid body that moves with them, so you can't walk through each other. Seated guests are left to their chair.
    const rb = body.current;
    if (rb) {
      if (rb.isEnabled() === st.seated) rb.setEnabled(!st.seated);
      if (!st.seated)
        rb.setNextKinematicTranslation({
          x: g.position.x,
          y: g.position.y + FOOT,
          z: g.position.z,
        });
    }

    // The name shows only up close, and fades with distance.
    const el = label.current;
    if (el) {
      const d = camera.position.distanceTo(g.position);
      el.style.opacity = String(THREE.MathUtils.clamp((7 - d) / 3, 0, 1));
      el.textContent = p.name;
    }
    // A line of table talk floats above them for a moment (only those at the table ever receive it).
    const sd = said.current;
    if (sd) {
      const on = !!p.said && performance.now() < p.said.until;
      if (on && sd.textContent !== p.said!.body) sd.textContent = p.said!.body;
      sd.style.opacity = on ? "1" : "0";
    }
  });

  const pick = (): Clip =>
    state.current.seated
      ? "sit_idle"
      : state.current.speed > 0.25
        ? "walk"
        : "stand_idle";

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[
          peer?.samples.at(-1)?.x ?? 0,
          peer?.samples.at(-1)?.y ?? FOOT,
          peer?.samples.at(-1)?.z ?? 0,
        ]}
      >
        <CapsuleCollider args={[0.55, 0.28]} />
      </RigidBody>
      <group ref={ref}>
        <Human
          key={avatar}
          avatar={avatar}
          pick={pick}
          seed={(look % 100) / 100}
        />
        <Html
          position={[0, 2.02, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            ref={label}
            className="eyebrow whitespace-nowrap text-[9px] text-ivory/90 opacity-0 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
          />
        </Html>
        <Html position={[0, 2.3, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div
            ref={said}
            className="w-max max-w-[220px] text-center font-display text-[13px] italic leading-snug text-ivory opacity-0 transition-opacity duration-500 [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]"
          />
        </Html>
      </group>
    </>
  );
}

/** Joins the live room once a signed-in guest is inside, and reports where they are every frame. */
function LiveSync() {
  const phase = useGame((s) => s.phase);
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const name = useAuth((s) => s.profile?.name);

  const first = (name ?? "").trim().split(/\s+/)[0] || "Guest";
  const uid = user?.id;
  const firstRef = useRef(first);
  useEffect(() => {
    firstRef.current = first;
    setLiveName(first);
  }, [first]);
  // Join once per signed-in guest; saving details or a new name doesn't leave and rejoin the sitting.
  useEffect(() => {
    if (phase !== "playing" || status !== "signedIn" || !uid) return;
    connectLive({ id: uid, name: firstRef.current });
    startChat(uid);
    startService(uid);
    // Sitting at a table joins its table talk; standing up leaves it.
    const seat = (chair: string | null) => void setTable(chair ? chair.split("-")[0] : null);
    seat(useGame.getState().seatedChairId);
    const off = useGame.subscribe((s, prev) => {
      if (s.seatedChairId !== prev.seatedChairId) seat(s.seatedChairId);
    });
    return () => {
      off();
      stopChat();
      stopService();
      disconnectLive();
    };
  }, [phase, status, uid]);

  useFrame(({ clock }) => {
    const s = useGame.getState();
    if (s.phase !== "playing" || s.intro) return;
    const p = runtime.playerPos;
    publishSelf(clock.elapsedTime * 1000, {
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: s.yaw,
      chair: s.seatedChairId,
    });
  });
  return null;
}

/** Every other real guest in this sitting. */
export default function LiveGuests() {
  const ids = useLive((s) => s.ids);
  return (
    <>
      <LiveSync />
      <Suspense fallback={null}>
        {ids.map((id) => (
          <RemoteGuest key={id} id={id} />
        ))}
      </Suspense>
    </>
  );
}
