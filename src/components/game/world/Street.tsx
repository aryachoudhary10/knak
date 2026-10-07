"use client";

import { useEffect, useMemo } from "react";
import { Sky, Stars } from "@react-three/drei";
import { daylight, useIndiaHour } from "@/game/daylight";
import { streetMaterials } from "./street/materials";
import type * as THREE from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMats } from "@/game/materials";
import StreetScene from "./street/StreetScene";

/** The two lamps by the café door, matching the candélabres down the street but casting real light. */
function StreetLamp({ x, z, lamps }: { x: number; z: number; lamps: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.17, 0.24, 0.7, 8]} />
      </mesh>
      <mesh position={[0, 2.4, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.065, 0.1, 3.3, 8]} />
      </mesh>
      <mesh position={[0, 4.1, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.12, 0.07, 0.18, 8]} />
      </mesh>
      <mesh position={[0, 4.48, 0]} rotation={[0, Math.PI / 4, 0]} material={m.glassWarm}>
        <cylinderGeometry args={[0.26, 0.16, 0.55, 4]} />
      </mesh>
      <mesh position={[0, 4.89, 0]} rotation={[0, Math.PI / 4, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.06, 0.38, 0.28, 4]} />
      </mesh>
      <pointLight color="#ffc27a" intensity={10 * lamps} distance={9} decay={2} position={[0, 4.3, 0]} />
    </group>
  );
}

/** Sky, air and the street's own lights, set by the hour in India. */
function TimeOfDay({ lamps, d }: { lamps: number; d: ReturnType<typeof daylight> }) {
  useEffect(() => {
    const m = streetMaterials();
    // Neighbours' windows and shop glow fade by day, as lights would be off or lost in the daylight.
    (m.lit as THREE.MeshBasicMaterial).color.setScalar(0.35 + 0.65 * lamps);
    (m.glow as THREE.MeshBasicMaterial).opacity = lamps;
    (m.paint as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + 0.23 * lamps;
  }, [lamps]);
  return (
    <>
      <color attach="background" args={[d.air]} />
      <fog attach="fog" args={[d.fog, 35, 110]} />
      <Sky distance={4500} sunPosition={d.sunPos} turbidity={d.night ? 9 : 6} rayleigh={d.night ? 2.6 : 1.6} mieCoefficient={0.006} mieDirectionalG={0.85} />
      {d.night && <Stars radius={300} depth={60} count={1500} factor={4} saturation={0} fade speed={0} />}
    </>
  );
}

export default function Street() {
  const hour = useIndiaHour();
  const d = useMemo(() => daylight(hour), [hour]);
  return (
    <group>
      <TimeOfDay lamps={d.lamps} d={d} />
      {/* Neighbouring buildings, the far side of the road, pavements, trees and street furniture. */}
      <StreetScene />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2c2a27" roughness={1} />
      </mesh>

      <StreetLamp x={-6.8} z={8.4} lamps={d.lamps} />
      <StreetLamp x={6.8} z={8.4} lamps={d.lamps} />

      {/* Ground and invisible street boundaries */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[40, 0.5, 40]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[0.5, 4, 6]} position={[-10.5, 4, 4]} />
        <CuboidCollider args={[0.5, 4, 6]} position={[10.5, 4, 4]} />
        <CuboidCollider args={[12, 4, 0.5]} position={[0, 4, 9.6]} />
      </RigidBody>
    </group>
  );
}
