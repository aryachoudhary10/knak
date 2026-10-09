"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  GUESTS,
  STAFF,
  TABLES,
  WAITER_PATH,
  WAITING_GUEST,
  CHAIR_BY_ID,
  type Npc,
} from "@/game/layout";
import { useGame } from "@/game/store";
import { useMats } from "@/game/materials";
import { plateGeo } from "@/game/geometry";
import { announce, arrive, doneServing, useService } from "@/game/service";
import { runtime } from "@/game/runtime";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useLive } from "@/game/live";
import {
  GUEST_AVATARS,
  Human,
  WALK_SPEED,
  preloadPeople,
  type AvatarId,
  type Clip,
} from "./Human";

/**
 * People are most of what a first visit downloads, so they arrive in order of need: the staff first (Amélie greets
 * every guest), then the diners. Phones seat their diners from four looks instead of eight, which saves about 2.7 MB
 * of mobile data; a guest who chooses one of the other looks still appears as chosen.
 */
const STAFF_AVATARS: AvatarId[] = ["hostess_amelie", "cashier_louis", "waiter_theo", "barista_nisha", "guest_m2", "guest_f3"];
const phone = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const DINER_LOOKS = GUEST_AVATARS.slice(0, phone() ? 4 : GUEST_AVATARS.length);
preloadPeople(STAFF_AVATARS);

/** Mounted once its Suspense boundary has everything it needs: tells the parent the staff have arrived. */
function Loaded({ then }: { then: () => void }) {
  useEffect(() => then(), [then]);
  return null;
}

const STAFF_AVATAR: Record<string, AvatarId> = {
  host: "hostess_amelie",
  cashier: "cashier_louis",
  barista: "barista_nisha",
  bartender: "guest_m2",
};

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
      {/* solid, so nobody walks through the staff */}
      <RigidBody type="fixed" colliders={false} position={[0, 0.85, 0]}>
        <CapsuleCollider args={[0.55, 0.26]} />
      </RigidBody>
      <group ref={ref} rotation={[0, npc.rot, 0]}>
        <Human
          avatar={STAFF_AVATAR[npc.id] ?? "guest_f1"}
          pick={pick}
          seed={seed}
        />
      </group>
    </group>
  );
}

/** Seated guests lean in to the table: their hands should rest just past its near edge. */
function seatOffset(npc: Npc) {
  if (npc.pose !== "sit" || npc.lounge)
    return { x: npc.x, z: npc.z, y: npc.y ?? 0 };
  let best = TABLES[0];
  let bestD = Infinity;
  for (const t of TABLES) {
    const d = Math.hypot(t.x - npc.x, t.z - npc.z);
    if (d < bestD) [best, bestD] = [t, d];
  }
  const half =
    best.shape === "rect" ? (best.w ?? 0.9) / 2 : (best.radius ?? 0.5);
  const banquette = npc.id.includes("-b");
  const forward = Math.max(0, bestD - half - 0.34);
  return {
    x: npc.x + Math.sin(npc.rot) * forward,
    z: npc.z + Math.cos(npc.rot) * forward,
    y: banquette ? 0.07 : 0,
  };
}

const SIT_IDLES: Clip[] = ["sit_idle", "sit_idle_2", "sit_idle_3"];

function PlacedNpc({
  npc,
  seed,
  avatar,
}: {
  npc: Npc;
  seed: number;
  avatar: AvatarId;
}) {
  const at = useMemo(() => seatOffset(npc), [npc]);
  const idle = SIT_IDLES[Math.floor(seed * 97) % SIT_IDLES.length];
  // Guests at the same table take turns talking.
  const pick = (): Clip =>
    npc.pose === "stand"
      ? "stand_idle"
      : Math.sin(runtime.now * 0.12 + seed * 10) > 0.55
        ? "sit_talk"
        : idle;
  return (
    <group position={[at.x, at.y, at.z]} rotation={[0, npc.rot, 0]}>
      {npc.pose === "stand" && (
        <RigidBody type="fixed" colliders={false} position={[0, 0.85, 0]}>
          <CapsuleCollider args={[0.55, 0.26]} />
        </RigidBody>
      )}
      <Human avatar={avatar} pick={pick} seed={seed} />
    </group>
  );
}

/** The dining room, where Théo can walk to a guest: inside the doors, short of the counter, clear of the walls. */
const inDiningRoom = (x: number, z: number) => Math.abs(x) < 7.6 && z < -1.6 && z > -14.4;
/** Théo's two lanes either side of the runner. */
const LANE = 0.5;

type Leg = THREE.Vector2[];

/** Where Théo stands to serve: beside the chair, on the side nearer the aisle; or a step from a standing guest. */
function servePoint(chairId: string | null): { stand: THREE.Vector2; face: THREE.Vector2 } | null {
  if (chairId) {
    const c = CHAIR_BY_ID[chairId];
    if (!c || c.outdoor || !inDiningRoom(c.x, c.z)) return null;
    // Perpendicular to the way the guest faces, toward the middle of the room.
    const px = Math.cos(c.rot);
    const pz = -Math.sin(c.rot);
    const side = Math.sign(-c.x * px) || 1;
    // Far enough to the side to stay out of the guest's face, a little toward the table to set the plate down.
    const fx = Math.sin(c.rot) * 0.2;
    const fz = Math.cos(c.rot) * 0.2;
    return { stand: new THREE.Vector2(c.x + px * side * 0.9 + fx, c.z + pz * side * 0.9 + fz), face: new THREE.Vector2(c.x + fx * 2, c.z + fz * 2) };
  }
  const p = runtime.playerPos;
  if (!inDiningRoom(p.x, p.z)) return null;
  const dir = new THREE.Vector2(-p.x, 0).normalize();
  if (!dir.lengthSq()) dir.set(1, 0);
  return { stand: new THREE.Vector2(p.x + dir.x * 0.85, p.z - 0.25), face: new THREE.Vector2(p.x, p.z) };
}

/** Down his lane to the guest's row, then across to them. */
function routeTo(from: THREE.Vector2, to: THREE.Vector2): Leg {
  const lane = to.x < 0 ? -LANE : LANE;
  return [from.clone(), new THREE.Vector2(lane, from.y), new THREE.Vector2(lane, to.y), to.clone()];
}

/**
 * Théo walks his loop up and down the aisle. When the kitchen marks the guest's order ready he leaves it, brings
 * the plate to their table (or to them), says so, and goes back to his round.
 */
function Waiter() {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const dist = useRef(0);
  const moving = useRef(true);
  const trip = useRef<{ legs: Leg; i: number; phase: "go" | "serve" | "back"; face?: THREE.Vector2; until: number; id: string } | null>(null);
  const segs = useMemo(() => {
    const pts = WAITER_PATH.map(([x, z]) => new THREE.Vector2(x, z));
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      return { a, b, len: a.distanceTo(b) };
    });
  }, []);
  const total = segs.reduce((s, x) => s + x.len, 0);
  const tmp = useMemo(() => new THREE.Vector2(), []);

  const place = (x: number, z: number, heading: number, dt: number) => {
    const g = ref.current!;
    g.position.set(x, 0, z);
    const cur = g.rotation.y;
    g.rotation.y = cur + Math.atan2(Math.sin(heading - cur), Math.cos(heading - cur)) * Math.min(1, dt * 6);
    body.current?.setNextKinematicTranslation({ x, y: 0.85, z });
    runtime.waiterPos.set(x, 0, z);
  };

  /** Walk along a route; true once at its end. */
  const walk = (t: NonNullable<typeof trip.current>, dt: number) => {
    let step = dt * WALK_SPEED.male;
    const g = ref.current!;
    tmp.set(g.position.x, g.position.z);
    while (t.i < t.legs.length && step > 0) {
      const target = t.legs[t.i];
      const d = tmp.distanceTo(target);
      if (d <= step) {
        tmp.copy(target);
        step -= d;
        t.i++;
      } else {
        tmp.lerp(target, step / d);
        step = 0;
      }
    }
    const next = t.legs[Math.min(t.i, t.legs.length - 1)];
    const heading = next.distanceTo(tmp) > 1e-3 ? Math.atan2(next.x - tmp.x, next.y - tmp.y) : g.rotation.y;
    place(tmp.x, tmp.y, heading, dt);
    return t.i >= t.legs.length;
  };

  useFrame((_, dt) => {
    if (!ref.current) return;
    const serving = useService.getState().serving;
    const t = trip.current;

    // A new order to bring out.
    if (serving && (!t || t.id !== serving.id) && (!t || t.phase !== "serve")) {
      const at = servePoint(useGame.getState().seatedChairId);
      if (!at) announce();
      else {
        const from = new THREE.Vector2(ref.current.position.x, ref.current.position.z);
        trip.current = { legs: routeTo(from, at.stand), i: 1, phase: "go", face: at.face, until: 0, id: serving.id };
      }
    }

    if (trip.current) {
      const tr = trip.current;
      moving.current = tr.phase !== "serve";
      if (tr.phase === "go" && walk(tr, dt)) {
        const ms = arrive() ?? 3000;
        tr.phase = "serve";
        tr.until = runtime.now + ms / 1000 + 1;
      } else if (tr.phase === "serve") {
        const g = ref.current;
        if (tr.face) place(g.position.x, g.position.z, Math.atan2(tr.face.x - g.position.x, tr.face.y - g.position.z), dt);
        if (runtime.now > tr.until) {
          doneServing();
          // Back to the nearer lane, at this row, and on with the round from there.
          const lane = g.position.x < 0 ? -LANE : LANE;
          const z = THREE.MathUtils.clamp(g.position.z, -12.6, -2.5);
          trip.current = { ...tr, legs: [new THREE.Vector2(g.position.x, g.position.z), new THREE.Vector2(lane, z)], i: 1, phase: "back" };
        }
      } else if (tr.phase === "back" && walk(tr, dt)) {
        const p = ref.current.position;
        // Rejoin the loop where he stands: down the right lane (x 0.5) or back up the left one.
        dist.current = p.x > 0 ? -2.5 - p.z : 10.1 + 1 + (p.z + 12.6);
        trip.current = null;
      }
      return;
    }

    // Pause politely if the visitor is standing in the way.
    moving.current = runtime.playerPos.distanceTo(ref.current.position) > 1.3;
    dist.current = (dist.current + dt * (moving.current ? WALK_SPEED.male : 0)) % total;
    let d = dist.current;
    for (const s of segs) {
      if (d <= s.len) {
        const k = d / s.len;
        place(THREE.MathUtils.lerp(s.a.x, s.b.x, k), THREE.MathUtils.lerp(s.a.y, s.b.y, k), Math.atan2(s.b.x - s.a.x, s.b.y - s.a.y), dt);
        break;
      }
      d -= s.len;
    }
  });
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[WAITER_PATH[0][0], 0.85, WAITER_PATH[0][1]]}>
        <CapsuleCollider args={[0.55, 0.26]} />
      </RigidBody>
      <group ref={ref}>
        <Human avatar="waiter_theo" pick={() => (moving.current ? "walk" : trip.current?.phase === "serve" ? "talk" : "stand_idle")} seed={0.3} />
      </group>
    </>
  );
}

/** What Théo set down in front of the guest: a covered dish, as a grand café would bring it, and a napkin. */
function ServedPlate() {
  const chairId = useService((s) => s.plateAt);
  const m = useMats();
  if (!chairId) return null;
  const c = CHAIR_BY_ID[chairId];
  const table = TABLES.find((t) => t.id === chairId.split("-")[0]);
  if (!c || !table) return null;
  const half = table.shape === "rect" ? (table.w ?? 0.9) / 2 : (table.radius ?? 0.5);
  const dx = c.x - table.x;
  const dz = c.z - table.z;
  const len = Math.hypot(dx, dz) || 1;
  const r = Math.max(0.12, half - 0.2);
  return (
    <group position={[table.x + (dx / len) * r, 0.772, table.z + (dz / len) * r]} rotation={[0, c.rot, 0]}>
      <mesh geometry={plateGeo(0.16)} material={m.porcelain} />
      {/* the silver cloche */}
      <mesh position={[0, 0.014, 0]} material={m.silver}>
        <sphereGeometry args={[0.12, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.142, 0]} material={m.silver}>
        <sphereGeometry args={[0.016, 12, 8]} />
      </mesh>
      <mesh position={[0.21, 0.006, 0.02]} rotation={[0, 0.15, 0]} material={m.linen}>
        <boxGeometry args={[0.09, 0.012, 0.16]} />
      </mesh>
    </group>
  );
}

/** NPC diners always left in the room, however many real guests arrive. */
const MIN_NPC_DINERS = 4;

export default function People() {
  // As real guests arrive, NPC diners quietly leave (from the end of the list), so the room stays about as full and
  // phones never draw more people than before.
  const live = useLive((s) => s.ids.length);
  const diners = GUESTS.slice(0, Math.max(MIN_NPC_DINERS, GUESTS.length - live));
  const [staffIn, setStaffIn] = useState(false);
  const onStaff = useCallback(() => {
    preloadPeople(DINER_LOOKS);
    setStaffIn(true);
  }, []);
  // People stream in after the room, so the restaurant appears without waiting for them.
  return (
    <group>
      <Suspense fallback={null}>
        {STAFF.map((s, i) => (
          <StaffNpc key={s.id} npc={s} seed={0.5 + i * 0.1} />
        ))}
        <PlacedNpc npc={WAITING_GUEST} seed={0.9} avatar="guest_f3" />
        <Waiter />
        <ServedPlate />
        <Loaded then={onStaff} />
      </Suspense>
      {staffIn && (
        <Suspense fallback={null}>
          {diners.map((g, i) => (
            <PlacedNpc key={g.id} npc={g} seed={(i * 0.618) % 1} avatar={DINER_LOOKS[i % DINER_LOOKS.length]} />
          ))}
        </Suspense>
      )}
    </group>
  );
}
