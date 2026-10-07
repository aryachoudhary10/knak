"use client";

import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMats } from "@/game/materials";
import { bottlesTexture, signTexture } from "@/game/textures";
import { COUNTER, ROOM } from "@/game/layout";

const { z: CZ, halfWidth: HW, depth: DEP, height: HT } = COUNTER;

function EspressoMachine({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, 1.0, ROOM.minZ + 0.45]}>
      <mesh position={[0, 0.22, 0]} material={m.zinc}>
        <boxGeometry args={[0.8, 0.44, 0.45]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={m.brass}>
        <sphereGeometry args={[0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.68, 0]} material={m.brass}>
        <sphereGeometry args={[0.04, 10, 8]} />
      </mesh>
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, 0.08, 0.27]} material={m.blackIron}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function CakeDome({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, HT + 0.03, CZ + 0.05]}>
      <mesh position={[0, 0.03, 0]} material={m.brass}>
        <cylinderGeometry args={[0.2, 0.12, 0.06, 24]} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.12, 24]} />
        <meshStandardMaterial color="#5a2e1a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.185, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.015, 24]} />
        <meshStandardMaterial color="#f3e6cf" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.22} roughness={0.05} />
      </mesh>
    </group>
  );
}

function MenuStand({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, HT + 0.03, CZ + 0.3]} rotation={[-0.35, 0, 0]}>
      <mesh position={[0, 0.17, 0]} material={m.burgundy}>
        <boxGeometry args={[0.28, 0.36, 0.02]} />
      </mesh>
      <mesh position={[0, 0.17, 0.012]} material={m.gilt}>
        <boxGeometry args={[0.2, 0.025, 0.004]} />
      </mesh>
      <mesh position={[0, 0.25, 0.012]} material={m.gilt}>
        <boxGeometry args={[0.12, 0.012, 0.004]} />
      </mesh>
    </group>
  );
}

export default function Counter() {
  const m = useMats();
  const bottles = useMemo(() => bottlesTexture(), []);
  const sign = useMemo(() => signTexture(), []);
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HW + DEP / 2, HT / 2, DEP / 2]} position={[0, HT / 2, CZ]} />
        {/* the back bar stops short of the arches to the bar salon on either side */}
        <CuboidCollider args={[4.8, 0.6, 0.35]} position={[0, 0.6, ROOM.minZ + 0.35]} />
      </RigidBody>

      {/* counter body: walnut front, rounded ends */}
      <mesh position={[0, HT / 2, CZ]} material={m.walnut} castShadow>
        <boxGeometry args={[HW * 2, HT, DEP]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HW, HT / 2, CZ]} material={m.walnut}>
          <cylinderGeometry args={[DEP / 2, DEP / 2, HT, 24, 1, false, s > 0 ? 0 : Math.PI, Math.PI]} />
        </mesh>
      ))}
      {/* fluted panels */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-HW + 0.25 + i * ((HW * 2 - 0.5) / 13), HT / 2 + 0.05, CZ + DEP / 2 + 0.01]} material={m.darkWood}>
          <boxGeometry args={[0.04, HT - 0.4, 0.02]} />
        </mesh>
      ))}
      {/* zinc top with brass edge */}
      <mesh position={[0, HT + 0.015, CZ + 0.03]} material={m.zinc}>
        <boxGeometry args={[HW * 2 + DEP + 0.1, 0.04, DEP + 0.14]} />
      </mesh>
      <mesh position={[0, HT - 0.02, CZ + DEP / 2 + 0.1]} material={m.brass}>
        <boxGeometry args={[HW * 2 + DEP + 0.1, 0.03, 0.03]} />
      </mesh>
      {/* foot rail */}
      <mesh position={[0, 0.18, CZ + DEP / 2 + 0.16]} rotation={[0, 0, Math.PI / 2]} material={m.brass}>
        <cylinderGeometry args={[0.025, 0.025, HW * 2, 10]} />
      </mesh>

      <CakeDome x={-1.6} />
      <CakeDome x={-1.05} />
      <MenuStand x={0} />
      {/* brass bell */}
      <mesh position={[0.6, HT + 0.07, CZ + 0.15]} material={m.brass}>
        <sphereGeometry args={[0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* back bar */}
      <mesh position={[0, 0.5, ROOM.minZ + 0.35]} material={m.walnut}>
        <boxGeometry args={[9.2, 1.0, 0.7]} />
      </mesh>
      <mesh position={[0, 1.02, ROOM.minZ + 0.35]} material={m.marble}>
        <boxGeometry args={[9.3, 0.04, 0.74]} />
      </mesh>
      <EspressoMachine x={-2.2} />

      {/* backlit bottle wall with gilt frame */}
      <mesh position={[0, 2.6, ROOM.minZ + 0.03]}>
        <planeGeometry args={[8.4, 2.6]} />
        <meshStandardMaterial map={bottles} emissive="#ffffff" emissiveMap={bottles} emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.95, ROOM.minZ + 0.06]} material={m.gilt}>
        <boxGeometry args={[8.7, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0, 1.25, ROOM.minZ + 0.06]} material={m.gilt}>
        <boxGeometry args={[8.7, 0.08, 0.08]} />
      </mesh>
      {[-4.3, 4.3].map((x) => (
        <mesh key={x} position={[x, 2.6, ROOM.minZ + 0.06]} material={m.gilt}>
          <boxGeometry args={[0.12, 2.8, 0.08]} />
        </mesh>
      ))}
      <mesh position={[0, 4.55, ROOM.minZ + 0.05]}>
        <planeGeometry args={[2.6, 0.65]} />
        <meshStandardMaterial map={sign} transparent emissive="#7a5418" emissiveMap={sign} emissiveIntensity={0.9} metalness={0.6} roughness={0.35} />
      </mesh>
      <pointLight color="#ffcf91" intensity={10} distance={7} decay={2} position={[0, 2.4, ROOM.minZ + 1.6]} />
    </group>
  );
}
