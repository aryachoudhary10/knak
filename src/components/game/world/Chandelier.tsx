"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { prismGeo } from "@/game/geometry";

const STRANDS = 18;
const PER_STRAND = 5;
const ARMS = 12;

/** Empire "basket" chandelier: a crown, strands of crystal drops, a ring of candle bulbs and a hanging bag of crystals. */
export default function Chandelier({ position, ceiling, light = true }: { position: [number, number, number]; ceiling: number; light?: boolean }) {
  const m = useMats();
  const crystals = useRef<THREE.InstancedMesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const seed = position[2];

  const transforms = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const crownR = 0.32, crownY = 0.75, ringR = 0.66, ringY = 0.12, tipY = -0.75;
    for (let i = 0; i < STRANDS; i++) {
      const a = (i / STRANDS) * Math.PI * 2;
      for (let k = 0; k < PER_STRAND; k++) {
        // upper strands: crown to ring, sagging slightly
        const t = (k + 0.5) / PER_STRAND;
        const r = THREE.MathUtils.lerp(crownR, ringR, t);
        const y = THREE.MathUtils.lerp(crownY, ringY, t) - Math.sin(t * Math.PI) * 0.06;
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), q, s));
        // lower bag: ring to the tip
        const r2 = THREE.MathUtils.lerp(ringR, 0.04, t * t);
        const y2 = THREE.MathUtils.lerp(ringY - 0.05, tipY, t);
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a + 0.17) * r2, y2, Math.sin(a + 0.17) * r2), q, s));
      }
    }
    // hanging pendants around the ring
    for (let i = 0; i < ARMS * 2; i++) {
      const a = (i / (ARMS * 2)) * Math.PI * 2;
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.72, ringY - 0.12, Math.sin(a) * 0.72), q, new THREE.Vector3(1.3, 1.5, 1.3)));
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = crystals.current;
    if (!mesh) return;
    transforms.forEach((mtx, i) => mesh.setMatrixAt(i, mtx));
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  useFrame(({ clock }) => {
    if (lamp.current) {
      const t = clock.elapsedTime + seed;
      lamp.current.intensity = 26 + Math.sin(t * 7.3) * 0.8 + Math.sin(t * 3.1) * 0.6;
    }
  });

  return (
    <group position={position}>
      {/* chain and canopy */}
      <mesh position={[0, (ceiling - position[1]) / 2 + 0.45, 0]} material={m.brass}>
        <cylinderGeometry args={[0.012, 0.012, ceiling - position[1] - 0.9, 6]} />
      </mesh>
      <mesh position={[0, ceiling - position[1] - 0.05, 0]} material={m.gilt}>
        <cylinderGeometry args={[0.12, 0.2, 0.1, 24]} />
      </mesh>
      {/* crown */}
      <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
        <torusGeometry args={[0.32, 0.018, 8, 40]} />
      </mesh>
      <mesh position={[0, 0.86, 0]} material={m.gilt}>
        <cylinderGeometry args={[0.06, 0.32, 0.12, 24, 1, true]} />
      </mesh>
      {/* main ring */}
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
        <torusGeometry args={[0.66, 0.026, 10, 64]} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
        <torusGeometry args={[0.7, 0.012, 6, 64]} />
      </mesh>
      {Array.from({ length: ARMS }, (_, i) => {
        const a = (i / ARMS) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.66, 0.14, Math.sin(a) * 0.66]}>
            <mesh position={[0, 0.02, 0]} material={m.gilt}>
              <cylinderGeometry args={[0.035, 0.025, 0.03, 12]} />
            </mesh>
            <mesh position={[0, 0.09, 0]} material={m.porcelain}>
              <cylinderGeometry args={[0.016, 0.016, 0.12, 10]} />
            </mesh>
            <mesh position={[0, 0.17, 0]} material={m.bulb} scale={[1, 1.5, 1]}>
              <sphereGeometry args={[0.018, 10, 8]} />
            </mesh>
          </group>
        );
      })}
      <instancedMesh ref={crystals} args={[prismGeo(), m.crystal, transforms.length]} />
      <mesh position={[0, -0.8, 0]} material={m.crystal}>
        <sphereGeometry args={[0.05, 12, 10]} />
      </mesh>
      {light && <pointLight ref={lamp} color="#ffc98a" intensity={26} distance={18} decay={1.5} position={[0, 0.1, 0]} />}
    </group>
  );
}
