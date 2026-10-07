"use client";

import GroupLight from "../GroupLight";
import SkyDome from "./SkyDome";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMats } from "@/game/materials";
import StreetScene from "./street/StreetScene";

/** The two lamps by the café door, matching the candélabres down the street but casting real light. */
function StreetLamp({ x, z }: { x: number; z: number }) {
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
      <GroupLight group="exterior" color="#ffc27a" intensity={10} distance={9} decay={2} position={[0, 4.3, 0]} />
    </group>
  );
}

export default function Street() {
  return (
    <group>
      {/* sky and air; their colours are set from the hour by the time-of-day driver in Lighting */}
      <color attach="background" args={["#121828"]} />
      <fog attach="fog" args={["#121624", 30, 100]} />
      <SkyDome />
      {/* Neighbouring buildings, the far side of the road, pavements, trees and street furniture. */}
      <StreetScene />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2c2a27" roughness={1} />
      </mesh>

      <StreetLamp x={-6.8} z={8.4} />
      <StreetLamp x={6.8} z={8.4} />

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
