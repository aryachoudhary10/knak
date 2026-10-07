"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lightGroups } from "@/game/atmosphere";
import { useMats } from "@/game/materials";

/** Three tiers, each a gilt ring with a glowing band and a curtain of crystal rods, smaller as they descend. */
const TIERS = [
  { y: 0.75, r: 0.95, rod: 0.62 },
  { y: 0.05, r: 0.74, rod: 0.55 },
  { y: -0.6, r: 0.52, rod: 0.46 },
];
const ROD_SPACING = 0.05;

let rodGeo: THREE.BufferGeometry | null = null;
const rodGeometry = () => (rodGeo ??= new THREE.CylinderGeometry(0.008, 0.008, 1, 5, 1).translate(0, -0.5, 0));

/** Tiered ring chandelier of the grand salon: three rings of crystal rods on a brass stem, each lit by a warm band. */
export default function Chandelier({ position, ceiling, light = true }: { position: [number, number, number]; ceiling: number; light?: boolean }) {
  const m = useMats();
  const rods = useRef<THREE.InstancedMesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const seed = position[2];

  const transforms = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    for (const t of TIERS) {
      const n = Math.round((t.r * Math.PI * 2) / ROD_SPACING);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        // rods hang a touch longer at alternate positions, so the hem shimmers instead of reading as a solid tube
        const len = t.rod * (i % 2 ? 0.9 : 1);
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * t.r, t.y - 0.03, Math.sin(a) * t.r), q, new THREE.Vector3(1, len, 1)));
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = rods.current;
    if (!mesh) return;
    transforms.forEach((mtx, i) => mesh.setMatrixAt(i, mtx));
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  useFrame(({ clock }) => {
    if (lamp.current) {
      const t = clock.elapsedTime + seed;
      lamp.current.intensity = (26 + Math.sin(t * 7.3) * 0.8 + Math.sin(t * 3.1) * 0.6) * lightGroups.levels.chandeliers;
    }
  });

  const top = TIERS[0].y;
  const bottom = TIERS[TIERS.length - 1].y - TIERS[TIERS.length - 1].rod;
  return (
    <group position={position}>
      {/* chain and canopy */}
      <mesh position={[0, (ceiling - position[1] + top) / 2, 0]} material={m.brass}>
        <cylinderGeometry args={[0.014, 0.014, ceiling - position[1] - top, 6]} />
      </mesh>
      <mesh position={[0, ceiling - position[1] - 0.05, 0]} material={m.gilt}>
        <cylinderGeometry args={[0.14, 0.24, 0.1, 24]} />
      </mesh>
      {/* the stem through all three tiers, ending in a crystal drop */}
      <mesh position={[0, (top + bottom) / 2 + 0.1, 0]} material={m.brass}>
        <cylinderGeometry args={[0.02, 0.02, top - bottom, 8]} />
      </mesh>
      <mesh position={[0, bottom - 0.02, 0]} material={m.crystal}>
        <sphereGeometry args={[0.06, 12, 10]} />
      </mesh>
      {TIERS.map((t) => (
        <group key={t.y} position={[0, t.y, 0]}>
          {/* gilt ring, with a glowing band on its inner face */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
            <torusGeometry args={[t.r, 0.028, 10, 72]} />
          </mesh>
          <mesh position={[0, -0.035, 0]} material={m.chandelierBulb}>
            <cylinderGeometry args={[t.r - 0.02, t.r - 0.02, 0.035, 72, 1, true]} />
          </mesh>
          {/* fine spokes back to the stem */}
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0, (k * Math.PI) / 4, Math.PI / 2]} material={m.brass}>
              <cylinderGeometry args={[0.006, 0.006, t.r * 2, 4]} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={rods} args={[rodGeometry(), m.crystal, transforms.length]} />
      {light && <pointLight ref={lamp} color="#ffc98a" intensity={13} distance={14} decay={1.8} position={[0, 0.1, 0]} />}
    </group>
  );
}
