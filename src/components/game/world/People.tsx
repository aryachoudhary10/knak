"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Character } from "@/lib/character";
import { GUESTS, STAFF, WAITER_PATH, WAITING_GUEST, type Npc } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { Person, type Outfit } from "./Person";

function NameLabel({ text, y, world }: { text: string; y: number; world: THREE.Vector3 }) {
  const el = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (!el.current) return;
    const p = runtime.playerPos;
    const inside = p.z < 1.0;
    const d = p.distanceTo(world);
    const show = inside && d < 7;
    el.current.style.opacity = show ? String(Math.min(1, (7 - d) / 2)) : "0";
  });
  return (
    <Html position={[0, y, 0]} center zIndexRange={[10, 0]} pointerEvents="none">
      <div
        ref={el}
        className="whitespace-nowrap rounded-full border border-[#c9a24a]/70 bg-[#1c1410]/75 px-3 py-0.5 font-display text-[14px] tracking-wide text-[#f3e3b5] shadow-lg backdrop-blur-sm"
        style={{ opacity: 0 }}
      >
        {text}
      </div>
    </Html>
  );
}

const OUTFIT: Record<string, Outfit> = { host: "host", cashier: "waiter", barista: "barista" };

/** Staff turn to face you when you come near; the host waves and talks while greeting. */
function StaffNpc({ npc, seed }: { npc: Npc; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(npc.x, 1.6, npc.z), [npc.x, npc.z]);
  const isHost = npc.id === "host";
  const isCashier = npc.id === "cashier";
  const since = (at: number) => (at < 0 ? Infinity : runtime.now - at);
  const wave = () => {
    if (!isHost) return 0;
    const d = since(runtime.greetAt);
    return d < 0.4 ? d / 0.4 : d < 2.6 ? 1 : d < 3.0 ? (3.0 - d) / 0.4 : 0;
  };
  const talk = () => {
    const d = since(isHost ? runtime.greetAt : isCashier ? runtime.cashierAt : -1);
    return d < 8 ? 1 : 0;
  };
  useFrame((_, dt) => {
    if (!ref.current) return;
    const p = runtime.playerPos;
    const d = Math.hypot(p.x - npc.x, p.z - npc.z);
    const target = d < 6.5 ? Math.atan2(p.x - npc.x, p.z - npc.z) : npc.rot;
    const cur = ref.current.rotation.y;
    const delta = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
    ref.current.rotation.y = cur + delta * Math.min(1, dt * 3);
  });
  return (
    <group position={[npc.x, 0, npc.z]}>
      <group ref={ref} rotation={[0, npc.rot, 0]}>
        <Person c={npc.character} pose="stand" seed={seed} outfit={OUTFIT[npc.id] ?? "casual"} wave={wave} talk={talk} />
      </group>
      {npc.label && <NameLabel text={npc.label} y={2.05} world={world} />}
    </group>
  );
}

function PlacedNpc({ npc, seed }: { npc: Npc; seed: number }) {
  const world = useMemo(() => new THREE.Vector3(npc.x, 1.6, npc.z), [npc.x, npc.z]);
  // Guests at the same table chat with each other.
  const talk = () => (Math.sin(runtime.now * 0.4 + seed * 10) > 0.3 ? 1 : 0);
  const outfit: Outfit = npc.character.hairStyle === "long" && seed > 0.5 ? "dress" : "casual";
  return (
    <group position={[npc.x, 0, npc.z]} rotation={[0, npc.rot, 0]}>
      <Person c={npc.character} pose={npc.pose} seed={seed} outfit={outfit} talk={talk} />
      {npc.label && <NameLabel text={npc.label} y={npc.pose === "sit" ? 1.75 : 2.05} world={world} />}
    </group>
  );
}

function Waiter() {
  const ref = useRef<THREE.Group>(null);
  const dist = useRef(0);
  const world = useMemo(() => new THREE.Vector3(), []);
  const segs = useMemo(() => {
    const pts = WAITER_PATH.map(([x, z]) => new THREE.Vector2(x, z));
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      return { a, b, len: a.distanceTo(b) };
    });
  }, []);
  const total = segs.reduce((s, x) => s + x.len, 0);
  const waiter: Character = { name: "Théo", skin: "#e2b48f", hair: "#3b2416", hairStyle: "short", top: "#f3efe6", bottom: "#1c1c1f" };

  useFrame((_, dt) => {
    if (!ref.current) return;
    // Pause politely if the visitor is standing in the way.
    const ahead = runtime.playerPos.distanceTo(ref.current.position) < 1.1;
    dist.current = (dist.current + dt * (ahead ? 0 : 1.15)) % total;
    let d = dist.current;
    for (const s of segs) {
      if (d <= s.len) {
        const t = d / s.len;
        const x = THREE.MathUtils.lerp(s.a.x, s.b.x, t);
        const z = THREE.MathUtils.lerp(s.a.y, s.b.y, t);
        ref.current.position.set(x, 0, z);
        const target = Math.atan2(s.b.x - s.a.x, s.b.y - s.a.y);
        const cur = ref.current.rotation.y;
        ref.current.rotation.y = cur + Math.atan2(Math.sin(target - cur), Math.cos(target - cur)) * 0.12;
        world.set(x, 1.6, z);
        break;
      }
      d -= s.len;
    }
  });
  return (
    <group ref={ref}>
      <Person c={waiter} pose="stand" walking tray outfit="waiter" seed={0.3} />
      <NameLabel text="Théo · Waiter" y={2.05} world={world} />
    </group>
  );
}

export default function People() {
  return (
    <group>
      {GUESTS.map((g, i) => (
        <PlacedNpc key={g.id} npc={g} seed={i / GUESTS.length} />
      ))}
      {STAFF.map((s, i) => (
        <StaffNpc key={s.id} npc={s} seed={0.5 + i * 0.1} />
      ))}
      <PlacedNpc npc={WAITING_GUEST} seed={0.9} />
      <Waiter />
    </group>
  );
}
