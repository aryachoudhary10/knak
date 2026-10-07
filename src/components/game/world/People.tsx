"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GUESTS, STAFF, TABLES, WAITER_PATH, WAITING_GUEST, type Npc } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { GUEST_AVATARS, Human, WALK_SPEED, preloadPeople, type AvatarId, type Clip } from "./Human";

preloadPeople();

const STAFF_AVATAR: Record<string, AvatarId> = { host: "hostess_amelie", cashier: "cashier_louis", barista: "barista_nisha", bartender: "guest_m2" };

/** Staff turn to face you when you come near; Amélie waves and talks while greeting, Louis talks when you order. */
function StaffNpc({ npc, seed }: { npc: Npc; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const since = (at: number) => (at < 0 ? Infinity : runtime.now - at);
  const pick = (): Clip => {
    if (npc.id === "host") {
      const d = since(runtime.greetAt);
      if (d < 2.6) return "wave";
      if (d < 8) return "talk";
    }
    if (npc.id === "cashier" && since(runtime.cashierAt) < 7) return "talk";
    return "stand_idle";
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
    <group position={[npc.x, npc.y ?? 0, npc.z]}>
      <group ref={ref} rotation={[0, npc.rot, 0]}>
        <Human avatar={STAFF_AVATAR[npc.id] ?? "guest_f1"} pick={pick} seed={seed} />
      </group>
    </group>
  );
}

/** Seated guests lean in to the table: their hands should rest just past its near edge. */
function seatOffset(npc: Npc) {
  if (npc.pose !== "sit" || npc.lounge) return { x: npc.x, z: npc.z, y: npc.y ?? 0 };
  let best = TABLES[0];
  let bestD = Infinity;
  for (const t of TABLES) {
    const d = Math.hypot(t.x - npc.x, t.z - npc.z);
    if (d < bestD) [best, bestD] = [t, d];
  }
  const half = best.shape === "rect" ? (best.w ?? 0.9) / 2 : best.radius ?? 0.5;
  const banquette = npc.id.includes("-b");
  const forward = Math.max(0, bestD - half - 0.34);
  return { x: npc.x + Math.sin(npc.rot) * forward, z: npc.z + Math.cos(npc.rot) * forward, y: banquette ? 0.07 : 0 };
}

const SIT_IDLES: Clip[] = ["sit_idle", "sit_idle_2", "sit_idle_3"];

function PlacedNpc({ npc, seed, avatar }: { npc: Npc; seed: number; avatar: AvatarId }) {
  const at = useMemo(() => seatOffset(npc), [npc]);
  const idle = SIT_IDLES[Math.floor(seed * 97) % SIT_IDLES.length];
  // Guests at the same table take turns talking.
  const pick = (): Clip => (npc.pose === "stand" ? "stand_idle" : Math.sin(runtime.now * 0.12 + seed * 10) > 0.55 ? "sit_talk" : idle);
  return (
    <group position={[at.x, at.y, at.z]} rotation={[0, npc.rot, 0]}>
      <Human avatar={avatar} pick={pick} seed={seed} />
    </group>
  );
}

function Waiter() {
  const ref = useRef<THREE.Group>(null);
  const dist = useRef(0);
  const moving = useRef(true);
  const segs = useMemo(() => {
    const pts = WAITER_PATH.map(([x, z]) => new THREE.Vector2(x, z));
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      return { a, b, len: a.distanceTo(b) };
    });
  }, []);
  const total = segs.reduce((s, x) => s + x.len, 0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    // Pause politely if the visitor is standing in the way.
    moving.current = runtime.playerPos.distanceTo(ref.current.position) > 1.3;
    dist.current = (dist.current + dt * (moving.current ? WALK_SPEED.male : 0)) % total;
    let d = dist.current;
    for (const s of segs) {
      if (d <= s.len) {
        const t = d / s.len;
        const x = THREE.MathUtils.lerp(s.a.x, s.b.x, t);
        const z = THREE.MathUtils.lerp(s.a.y, s.b.y, t);
        ref.current.position.set(x, 0, z);
        const target = Math.atan2(s.b.x - s.a.x, s.b.y - s.a.y);
        const cur = ref.current.rotation.y;
        ref.current.rotation.y = cur + Math.atan2(Math.sin(target - cur), Math.cos(target - cur)) * Math.min(1, dt * 6);
        break;
      }
      d -= s.len;
    }
  });
  return (
    <group ref={ref}>
      <Human avatar="waiter_theo" pick={() => (moving.current ? "walk" : "stand_idle")} seed={0.3} />
    </group>
  );
}

export default function People() {
  // People stream in after the room, so the restaurant appears without waiting for them.
  return (
    <Suspense fallback={null}>
      <group>
        {GUESTS.map((g, i) => (
          <PlacedNpc key={g.id} npc={g} seed={((i * 0.618) % 1)} avatar={GUEST_AVATARS[i % GUEST_AVATARS.length]} />
        ))}
        {STAFF.map((s, i) => (
          <StaffNpc key={s.id} npc={s} seed={0.5 + i * 0.1} />
        ))}
        <PlacedNpc npc={WAITING_GUEST} seed={0.9} avatar="guest_f3" />
        <Waiter />
      </group>
    </Suspense>
  );
}
