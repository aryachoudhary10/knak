"use client";

import { CylinderCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMats } from "@/game/materials";
import { CHAIRS, TABLES, type Table, type Chair } from "@/game/layout";

const glassMat = { color: "#ffffff", transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 } as const;

function PlaceSetting({ x, z, angle }: { x: number; z: number; angle: number }) {
  const m = useMats();
  return (
    <group position={[x, 0.765, z]} rotation={[0, angle, 0]}>
      <mesh material={m.linen}>
        <cylinderGeometry args={[0.13, 0.11, 0.015, 24]} />
      </mesh>
      <mesh position={[0, 0.012, 0]} material={m.linen}>
        <cylinderGeometry args={[0.09, 0.08, 0.01, 24]} />
      </mesh>
      <mesh position={[0.17, 0.003, 0]} material={m.zinc}>
        <boxGeometry args={[0.015, 0.004, 0.18]} />
      </mesh>
      <mesh position={[-0.17, 0.003, 0]} material={m.zinc}>
        <boxGeometry args={[0.015, 0.004, 0.18]} />
      </mesh>
      <group position={[0.14, 0, -0.16]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.1, 6]} />
          <meshStandardMaterial {...glassMat} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.04, 0.025, 0.1, 12, 1, true]} />
          <meshStandardMaterial {...glassMat} />
        </mesh>
      </group>
    </group>
  );
}

function TableMesh({ t }: { t: Table }) {
  const m = useMats();
  if (t.shape === "bistro") {
    const r = t.radius ?? 0.4;
    return (
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, 0.74, 0]} material={m.marble} castShadow>
          <cylinderGeometry args={[r, r, 0.04, 32]} />
        </mesh>
        <mesh position={[0, 0.37, 0]} material={m.blackIron}>
          <cylinderGeometry args={[0.035, 0.05, 0.72, 10]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={m.blackIron}>
          <cylinderGeometry args={[0.24, 0.26, 0.04, 16]} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 12]} />
          <meshStandardMaterial {...glassMat} />
        </mesh>
        <mesh position={[0, 0.92, 0]} material={m.leaf}>
          <icosahedronGeometry args={[0.07, 1]} />
        </mesh>
      </group>
    );
  }
  if (t.shape === "rect") {
    const w = t.w ?? 0.9;
    const d = t.d ?? 0.9;
    return (
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, 0.74, 0]} material={m.linen} castShadow>
          <boxGeometry args={[w, 0.04, d]} />
        </mesh>
        <mesh position={[0, 0.56, 0]} material={m.linen}>
          <boxGeometry args={[w + 0.02, 0.36, d + 0.02]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={m.darkWood}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
        </mesh>
        <PlaceSetting x={-0.28} z={0} angle={-Math.PI / 2} />
        <PlaceSetting x={0.28} z={0} angle={Math.PI / 2} />
      </group>
    );
  }
  const r = t.radius ?? 0.55;
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh position={[0, 0.745, 0]} material={m.linen} castShadow>
        <cylinderGeometry args={[r, r, 0.03, 40]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={m.linen}>
        <cylinderGeometry args={[r + 0.01, r + 0.08, 0.48, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} material={m.blackIron}>
        <cylinderGeometry args={[0.06, 0.25, 0.26, 12]} />
      </mesh>
    </group>
  );
}

export function ChairMesh({ chair }: { chair: Chair }) {
  const m = useMats();
  const seat = chair.outdoor ? m.cane : m.burgundy;
  return (
    <group position={[chair.x, 0, chair.z]} rotation={[0, chair.rot, 0]}>
      {/* seat */}
      <mesh position={[0, 0.46, 0]} material={m.rattan}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 20]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={seat}>
        <cylinderGeometry args={[0.2, 0.21, 0.05, 20]} />
      </mesh>
      {/* legs */}
      {[
        [0.15, 0.15], [-0.15, 0.15], [0.15, -0.15], [-0.15, -0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} rotation={[z * 0.25, 0, -x * 0.25]} material={m.rattan}>
          <cylinderGeometry args={[0.018, 0.016, 0.46, 6]} />
        </mesh>
      ))}
      {/* bentwood back hoop and cane panel */}
      <group position={[0, 0.48, -0.2]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 0.27, 0]} material={m.rattan}>
          <torusGeometry args={[0.2, 0.022, 8, 24, Math.PI]} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.13, 0]} material={m.rattan}>
            <cylinderGeometry args={[0.022, 0.022, 0.27, 6]} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0.005]} material={m.cane}>
          <circleGeometry args={[0.18, 20, 0, Math.PI]} />
        </mesh>
        <mesh position={[0, 0.17, 0.005]} material={m.cane}>
          <planeGeometry args={[0.36, 0.26]} />
        </mesh>
      </group>
    </group>
  );
}

export default function Furniture() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {TABLES.map((t) =>
          t.shape === "rect" ? (
            <CuboidCollider key={t.id} args={[(t.w ?? 0.9) / 2, 0.4, (t.d ?? 0.9) / 2]} position={[t.x, 0.4, t.z]} />
          ) : (
            <CylinderCollider key={t.id} args={[0.4, (t.radius ?? 0.5) + 0.02]} position={[t.x, 0.4, t.z]} />
          ),
        )}
      </RigidBody>
      {TABLES.map((t) => (
        <TableMesh key={t.id} t={t} />
      ))}
      {TABLES.filter((t) => t.shape === "round").map((t) =>
        CHAIRS.filter((c) => c.id.startsWith(`${t.id}-`)).map((c) => {
          const a = Math.atan2(c.x - t.x, c.z - t.z);
          const r = (t.radius ?? 0.55) - 0.2;
          return <PlaceSetting key={`ps-${c.id}`} x={t.x + Math.sin(a) * r} z={t.z + Math.cos(a) * r} angle={a} />;
        }),
      )}
      {CHAIRS.map((c) => (
        <ChairMesh key={c.id} chair={c} />
      ))}
    </group>
  );
}
