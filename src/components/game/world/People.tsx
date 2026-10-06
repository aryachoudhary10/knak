"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Character } from "@/lib/character";
import { GUESTS, STAFF, WAITER_PATH, WAITING_GUEST, type Npc } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { useMats } from "@/game/materials";

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, roughness = 0.8) {
  const key = `${color}-${roughness}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness });
    matCache.set(key, m);
  }
  return m;
}

function Hair({ c, y }: { c: Character; y: number }) {
  const hm = mat(c.hair, 0.9);
  if (c.hairStyle === "none") return null;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.03, -0.01]} material={hm} scale={[1.05, 0.9, 1.08]}>
        <sphereGeometry args={[0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
      </mesh>
      {c.hairStyle === "long" && (
        <mesh position={[0, -0.12, -0.07]} material={hm}>
          <boxGeometry args={[0.24, 0.3, 0.1]} />
        </mesh>
      )}
      {c.hairStyle === "bun" && (
        <mesh position={[0, 0.1, -0.1]} material={hm}>
          <sphereGeometry args={[0.065, 12, 10]} />
        </mesh>
      )}
    </group>
  );
}

type PersonProps = {
  c: Character;
  pose: "sit" | "stand";
  /** 0..1 animation phase offset */
  seed?: number;
  walking?: boolean;
  tray?: boolean;
};

/** A stylised low-poly person built from primitives; cheap enough to fill the room. */
export function Person({ c, pose, seed = 0, walking = false, tray = false }: PersonProps) {
  const skin = mat(c.skin, 0.7);
  const top = mat(c.top, 0.85);
  const bottom = mat(c.bottom, 0.85);
  const m = useMats();
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 20;
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.35) * 0.45 + Math.sin(t * 1.3) * 0.05;
      head.current.rotation.x = pose === "sit" ? 0.12 + Math.sin(t * 0.5) * 0.06 : Math.sin(t * 0.4) * 0.04;
    }
    if (pose === "sit" && armR.current) {
      // occasional sip or gesture
      const g = Math.max(0, Math.sin(t * 0.45)) ** 6;
      armR.current.rotation.x = -1.1 - g * 0.9;
    }
    if (walking && legL.current && legR.current) {
      const s = Math.sin(t * 6.5) * 0.45;
      legL.current.rotation.x = s;
      legR.current.rotation.x = -s;
    }
  });

  const sit = pose === "sit";
  const hipY = sit ? 0.52 : 0.86;
  const shoulderY = hipY + 0.52;
  const headY = shoulderY + 0.22;

  return (
    <group>
      {/* legs */}
      {[-1, 1].map((s) => (
        <group key={s} ref={s < 0 ? legL : legR} position={[s * 0.09, hipY, 0]}>
          {sit ? (
            <>
              <mesh position={[0, 0.02, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={bottom}>
                <capsuleGeometry args={[0.075, 0.3, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.25, 0.4]} material={bottom}>
                <capsuleGeometry args={[0.065, 0.38, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.5, 0.45]} material={m.blackIron}>
                <boxGeometry args={[0.09, 0.06, 0.2]} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, -0.42, 0]} material={bottom}>
                <capsuleGeometry args={[0.075, 0.68, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.83, 0.05]} material={m.blackIron}>
                <boxGeometry args={[0.09, 0.06, 0.22]} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {/* torso */}
      <group ref={torso} position={[0, hipY, 0]}>
        <mesh position={[0, 0.27, 0]} scale={[1.15, 1, 0.75]} material={top}>
          <capsuleGeometry args={[0.16, 0.3, 4, 12]} />
        </mesh>
      </group>
      {/* arms */}
      <group position={[-0.24, shoulderY, 0]} rotation={[sit ? -1.1 : 0, 0, sit ? 0 : 0.06]}>
        <mesh position={[0, -0.25, 0]} material={top}>
          <capsuleGeometry args={[0.05, 0.38, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={skin}>
          <sphereGeometry args={[0.05, 8, 8]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.24, shoulderY, 0]} rotation={[sit ? -1.1 : tray ? -1.4 : 0, 0, sit ? 0 : -0.06]}>
        <mesh position={[0, -0.25, 0]} material={top}>
          <capsuleGeometry args={[0.05, 0.38, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={skin}>
          <sphereGeometry args={[0.05, 8, 8]} />
        </mesh>
        {tray && (
          <group position={[0, -0.53, 0]} rotation={[1.4, 0, 0]}>
            <mesh material={m.zinc}>
              <cylinderGeometry args={[0.2, 0.2, 0.015, 24]} />
            </mesh>
            <mesh position={[0.06, 0.06, 0]}>
              <cylinderGeometry args={[0.03, 0.02, 0.1, 10]} />
              <meshStandardMaterial color="#7b1f2a" transparent opacity={0.8} />
            </mesh>
          </group>
        )}
      </group>
      {/* neck + head */}
      <mesh position={[0, shoulderY + 0.05, 0]} material={skin}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, 8]} />
      </mesh>
      <group ref={head} position={[0, headY, 0]}>
        <mesh material={skin} scale={[0.92, 1.05, 0.98]}>
          <sphereGeometry args={[0.12, 16, 12]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.042, 0.015, 0.108]} material={mat("#1d1410", 0.4)}>
            <sphereGeometry args={[0.013, 8, 6]} />
          </mesh>
        ))}
        <Hair c={c} y={0.02} />
      </group>
    </group>
  );
}

function NameLabel({ text, y, world }: { text: string; y: number; world: THREE.Vector3 }) {
  const el = useRef<HTMLDivElement>(null);
  useFrame(() => {
    if (!el.current) return;
    const p = runtime.playerPos;
    const inside = p.z < -0.3;
    const d = p.distanceTo(world);
    const show = inside && d < 9;
    el.current.style.opacity = show ? String(Math.min(1, (9 - d) / 2)) : "0";
  });
  return (
    <Html position={[0, y, 0]} center zIndexRange={[10, 0]} pointerEvents="none">
      <div
        ref={el}
        className="whitespace-nowrap rounded-full border border-[#c9a24a]/70 bg-[#1c1410]/80 px-3 py-1 font-serif text-[13px] tracking-wide text-[#f3e3b5] shadow-lg transition-opacity"
        style={{ opacity: 0 }}
      >
        {text}
      </div>
    </Html>
  );
}

function PlacedNpc({ npc, seed }: { npc: Npc; seed: number }) {
  const world = useMemo(() => new THREE.Vector3(npc.x, 1.6, npc.z), [npc.x, npc.z]);
  return (
    <group position={[npc.x, 0, npc.z]} rotation={[0, npc.rot, 0]}>
      <Person c={npc.character} pose={npc.pose} seed={seed} />
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
    const out: { a: THREE.Vector2; b: THREE.Vector2; len: number }[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push({ a, b, len: a.distanceTo(b) });
    }
    return out;
  }, []);
  const total = segs.reduce((s, x) => s + x.len, 0);
  const waiter: Character = { name: "Théo", skin: "#e2b48f", hair: "#3b2416", hairStyle: "short", top: "#f3efe6", bottom: "#1c1c1f" };

  useFrame((_, dt) => {
    if (!ref.current) return;
    dist.current = (dist.current + dt * 1.15) % total;
    let d = dist.current;
    for (const s of segs) {
      if (d <= s.len) {
        const t = d / s.len;
        const x = THREE.MathUtils.lerp(s.a.x, s.b.x, t);
        const z = THREE.MathUtils.lerp(s.a.y, s.b.y, t);
        ref.current.position.set(x, 0, z);
        const target = Math.atan2(s.b.x - s.a.x, s.b.y - s.a.y);
        const cur = ref.current.rotation.y;
        const delta = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
        ref.current.rotation.y = cur + delta * 0.15;
        world.set(x, 1.6, z);
        break;
      }
      d -= s.len;
    }
  });
  return (
    <group ref={ref}>
      <Person c={waiter} pose="stand" walking tray seed={0.3} />
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
        <PlacedNpc key={s.id} npc={s} seed={0.5 + i * 0.1} />
      ))}
      <PlacedNpc npc={WAITING_GUEST} seed={0.9} />
      <Waiter />
    </group>
  );
}
