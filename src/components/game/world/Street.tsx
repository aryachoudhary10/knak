"use client";

import { Sky } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMats } from "@/game/materials";

function StreetLamp({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.14, 0.18, 0.4, 12]} />
      </mesh>
      <mesh position={[0, 2.1, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.05, 0.08, 3.8, 10]} />
      </mesh>
      <mesh position={[0, 4.15, 0]} material={m.glassWarm}>
        <cylinderGeometry args={[0.22, 0.14, 0.45, 6]} />
      </mesh>
      <mesh position={[0, 4.45, 0]} material={m.blackIron}>
        <coneGeometry args={[0.3, 0.25, 6]} />
      </mesh>
      <pointLight color="#ffc27a" intensity={10} distance={9} decay={2} position={[0, 4.0, 0]} />
    </group>
  );
}

/** Neighbouring buildings so the facade sits in a street, not a void. */
function Neighbour({ x, w, h, color }: { x: number; w: number; h: number; color: string }) {
  return (
    <group position={[x, 0, -1]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) =>
        [1.6, 4.2].map((y) => (
          <mesh key={`${s}-${y}`} position={[s * w * 0.22, y + 0.7, 1.01]}>
            <planeGeometry args={[1.1, 1.8]} />
            <meshStandardMaterial color="#2a2018" emissive="#e8a85a" emissiveIntensity={y > 3 ? 0.15 : 0.45} />
          </mesh>
        )),
      )}
    </group>
  );
}

export default function Street() {
  const m = useMats();
  return (
    <group>
      <Sky distance={4500} sunPosition={[-40, -0.8, -100]} turbidity={9} rayleigh={2.6} mieCoefficient={0.006} mieDirectionalG={0.85} />
      {/* pavement */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 4.5]} receiveShadow material={m.paving}>
        <planeGeometry args={[30, 9]} />
      </mesh>
      {/* kerb + road */}
      <mesh position={[0, 0.06, 9.1]} material={m.stoneShade}>
        <boxGeometry args={[30, 0.12, 0.3]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 14]} material={m.road}>
        <planeGeometry args={[60, 10]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2c2a27" roughness={1} />
      </mesh>

      <Neighbour x={-13.5} w={7} h={9} color="#d8cdb6" />
      <Neighbour x={13.5} w={7} h={10} color="#cfc3aa" />

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
