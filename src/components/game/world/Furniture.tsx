"use client";

import { CylinderCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { balusterGeo, plateGeo, squareClothGeo, tableclothGeo, tubeGeo, wineGlassGeo } from "@/game/geometry";
import { CHAIRS, TABLES, type Table, type Chair } from "@/game/layout";

const TOP = 0.76;

/** A warm pool of light painted onto the cloth: the look of a lamp lighting its table, without a real light. */
let poolMat: THREE.MeshBasicMaterial | null = null;
function glowPool() {
  if (poolMat) return poolMat;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,190,110,0.55)");
  grad.addColorStop(0.45, "rgba(255,170,90,0.18)");
  grad.addColorStop(1, "rgba(255,160,80,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  poolMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  return poolMat;
}

function GlowPool({ size, y = TOP + 0.004 }: { size: number; y?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glowPool()} renderOrder={2}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/** Brass table lamp with a pleated silk shade, the signature of a grand café banquette. */
function TableLamp({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, TOP + 0.005, z]}>
      <mesh position={[0, 0.01, 0]} material={m.brass}>
        <cylinderGeometry args={[0.055, 0.065, 0.02, 20]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={m.brass}>
        <cylinderGeometry args={[0.008, 0.01, 0.3, 8]} />
      </mesh>
      <mesh position={[0, 0.33, 0]} material={m.lampShade}>
        <cylinderGeometry args={[0.06, 0.1, 0.13, 12, 1, true]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={m.bulb}>
        <sphereGeometry args={[0.018, 8, 8]} />
      </mesh>
    </group>
  );
}

function PlaceSetting({ x, z, angle, y = TOP }: { x: number; z: number; angle: number; y?: number }) {
  const m = useMats();
  return (
    <group position={[x, y + 0.012, z]} rotation={[0, angle, 0]}>
      <mesh geometry={plateGeo(0.14)} material={m.porcelain} />
      <mesh geometry={plateGeo(0.1)} material={m.porcelain} position={[0, 0.016, 0]} />
      {/* folded napkin */}
      <mesh position={[0, 0.034, 0]} rotation={[0, 0.5, 0]} material={m.linen}>
        <boxGeometry args={[0.07, 0.02, 0.1]} />
      </mesh>
      <mesh position={[0.18, 0.002, 0]} material={m.silver}>
        <boxGeometry args={[0.014, 0.004, 0.19]} />
      </mesh>
      <mesh position={[-0.18, 0.002, 0]} material={m.silver}>
        <boxGeometry args={[0.016, 0.004, 0.2]} />
      </mesh>
      <mesh position={[0.16, 0, -0.17]} geometry={wineGlassGeo()} material={m.glass} />
      <mesh position={[0.06, 0, -0.2]} geometry={wineGlassGeo()} material={m.glass} scale={[0.85, 0.8, 0.85]} />
    </group>
  );
}

/** Glass hurricane candle and a few roses in a bud vase. */
function Centrepiece({ x, z, y = TOP }: { x: number; z: number; y?: number }) {
  const m = useMats();
  return (
    <group position={[x, y + 0.01, z]}>
      <mesh geometry={balusterGeo()} material={m.brass} scale={[0.6, 0.5, 0.6]} />
      <mesh position={[0, 0.1, 0]} material={m.linen}>
        <cylinderGeometry args={[0.018, 0.018, 0.07, 12]} />
      </mesh>
      <mesh position={[0, 0.145, 0]} material={m.flame}>
        <sphereGeometry args={[0.009, 8, 8]} />
      </mesh>
      <mesh position={[0, 0.13, 0]} material={m.glass}>
        <cylinderGeometry args={[0.045, 0.04, 0.16, 20, 1, true]} />
      </mesh>
      <group position={[0.1, 0, 0.04]}>
        <mesh position={[0, 0.06, 0]} material={m.glass}>
          <cylinderGeometry args={[0.018, 0.025, 0.12, 14]} />
        </mesh>
        {[[0, 0.15, 0], [0.025, 0.14, 0.012], [-0.02, 0.135, -0.01]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <icosahedronGeometry args={[0.022, 1]} />
            <meshStandardMaterial color={i === 1 ? "#f2e2d0" : "#a31f34"} roughness={0.7} />
          </mesh>
        ))}
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
        <mesh position={[0, 0.74, 0]} material={m.marble} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, 0.03, 48]} />
        </mesh>
        <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
          <torusGeometry args={[r, 0.008, 6, 48]} />
        </mesh>
        <mesh position={[0, 0.37, 0]} material={m.blackIron} castShadow>
          <cylinderGeometry args={[0.03, 0.045, 0.72, 12]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.16, 0.04, Math.sin((i * Math.PI * 2) / 3) * 0.16]} rotation={[0, -(i * Math.PI * 2) / 3, Math.PI / 2 - 0.25]} material={m.blackIron}>
            <cylinderGeometry args={[0.015, 0.02, 0.36, 8]} />
          </mesh>
        ))}
        <Centrepiece x={0} z={0} y={0.745} />
      </group>
    );
  }
  if (t.shape === "rect") {
    const w = t.w ?? 0.9;
    const d = t.d ?? 0.9;
    return (
      <group position={[t.x, 0, t.z]}>
        <mesh position={[0, TOP - 0.13, 0]} geometry={squareClothGeo(w, d, 0.28)} material={m.linen} castShadow receiveShadow />
        <mesh position={[0, 0.3, 0]} material={m.walnut}>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
        </mesh>
        <mesh position={[0, 0.015, 0]} material={m.blackIron}>
          <boxGeometry args={[0.45, 0.03, 0.45]} />
        </mesh>
        <PlaceSetting x={-0.25} z={0} angle={-Math.PI / 2} />
        <PlaceSetting x={0.25} z={0} angle={Math.PI / 2} />
        <Centrepiece x={0} z={0.25} />
        <TableLamp x={0} z={-0.28} />
        <GlowPool size={1.15} />
      </group>
    );
  }
  const r = t.radius ?? 0.55;
  return (
    <group position={[t.x, 0, t.z]}>
      <mesh geometry={tableclothGeo(r, TOP, 0.62)} material={m.linen} castShadow receiveShadow />
      <Centrepiece x={0} z={0} />
      <GlowPool size={r * 1.9} />
    </group>
  );
}

export function ChairMesh({ chair }: { chair: Chair }) {
  const m = useMats();
  const cane = m.caneBack;
  const seat = chair.outdoor ? m.cane : m.burgundy;
  const frame = tubeGeo(
    "chair-back",
    [
      [-0.17, 0, -0.26], [-0.16, 0.46, -0.17], [-0.18, 0.72, -0.21], [-0.12, 0.9, -0.24], [0, 0.94, -0.245],
      [0.12, 0.9, -0.24], [0.18, 0.72, -0.21], [0.16, 0.46, -0.17], [0.17, 0, -0.26],
    ],
    0.016,
  );
  const legL = tubeGeo("chair-leg-l", [[-0.15, 0.46, 0.13], [-0.165, 0.25, 0.16], [-0.18, 0, 0.2]], 0.016);
  const legR = tubeGeo("chair-leg-r", [[0.15, 0.46, 0.13], [0.165, 0.25, 0.16], [0.18, 0, 0.2]], 0.016);
  return (
    <group position={[chair.x, 0, chair.z]} rotation={[0, chair.rot, 0]}>
      <mesh position={[0, 0.455, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.rattan}>
        <torusGeometry args={[0.215, 0.02, 8, 32]} />
      </mesh>
      <mesh position={[0, 0.48, 0]} material={seat} castShadow>
        <cylinderGeometry args={[0.2, 0.21, 0.05, 32]} />
      </mesh>
      <mesh position={[0, 0.18, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.rattan}>
        <torusGeometry args={[0.18, 0.012, 6, 32]} />
      </mesh>
      <mesh geometry={frame} material={m.rattan} castShadow />
      <mesh geometry={legL} material={m.rattan} />
      <mesh geometry={legR} material={m.rattan} />
      <mesh position={[0, 0.71, -0.215]} rotation={[-0.15, 0, 0]} material={cane}>
        <planeGeometry args={[0.3, 0.3]} />
      </mesh>
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
            <CylinderCollider key={t.id} args={[0.4, (t.radius ?? 0.5) + 0.04]} position={[t.x, 0.4, t.z]} />
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
