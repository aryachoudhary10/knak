"use client";

import GroupLight from "../GroupLight";
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { gardenGlass } from "@/game/glass";
import { useMats } from "@/game/materials";
import { luxuryMats } from "@/game/luxury";
import { WINTER } from "@/game/layout";
import { ChairMesh } from "./Furniture";

const { x0: X0, x1: X1, z0: Z0, z1: Z1, floor: F, eaves: EAVES, ridge: RIDGE } = WINTER;
const W = X1 - X0;
const D = Z0 - Z1;
const MX = (X0 + X1) / 2;
const MZ = (Z0 + Z1) / 2;
const PLINTH = F + 0.55;
const BAY = 1.275;

const glass = gardenGlass;
/** Painted cast iron: the conservatory's slender frame, in a deep green-black. */
const iron = new THREE.MeshStandardMaterial({ color: "#1f2a24", roughness: 0.45, metalness: 0.5 });
const water = new THREE.MeshPhysicalMaterial({ color: "#3d5a5a", roughness: 0.05, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 });
const frond = new THREE.MeshStandardMaterial({ color: "#3f5a2c", roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
const fern = new THREE.MeshStandardMaterial({ color: "#4f6b34", roughness: 0.85, flatShading: true });
const trunk = new THREE.MeshStandardMaterial({ color: "#6b5640", roughness: 0.95 });

let frondGeo: THREE.BufferGeometry | null = null;
/** One arching palm frond: a long narrow leaf blade bent down along its length. */
function palmFrond() {
  if (frondGeo) return frondGeo;
  const g = new THREE.PlaneGeometry(0.34, 1.6, 1, 8);
  g.translate(0, 0.8, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = y / 1.6;
    // taper to a point and arch over
    p.setX(i, p.getX(i) * (1 - t * 0.85));
    p.setZ(i, t * t * 0.9);
  }
  g.computeVertexNormals();
  frondGeo = g;
  return g;
}

/** A kentia palm in a tall ivory urn. */
function Palm({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  const m = useMats();
  const fronds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ ry: (i / 9) * Math.PI * 2 + (i % 2) * 0.2, tilt: 0.55 + (i % 3) * 0.18 })), []);
  return (
    <group position={[x, F, z]} scale={s}>
      <mesh position={[0, 0.35, 0]} material={m.stone}>
        <cylinderGeometry args={[0.42, 0.26, 0.7, 20]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneShade}>
        <torusGeometry args={[0.42, 0.045, 8, 28]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={trunk}>
        <cylinderGeometry args={[0.05, 0.08, 1.1, 8]} />
      </mesh>
      {fronds.map((f, i) => (
        <group key={i} position={[0, 1.7, 0]} rotation={[0, f.ry, 0]}>
          <mesh geometry={palmFrond()} rotation={[f.tilt, 0, 0]} material={frond} />
        </group>
      ))}
    </group>
  );
}

/** A low clipped fern in a stone trough along the glass. */
function Fern({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, F, z]}>
      <mesh position={[0, 0.2, 0]} material={m.stoneShade}>
        <boxGeometry args={[0.5, 0.4, 0.9]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} scale={[0.5, 0.32, 0.85]} material={fern}>
        <icosahedronGeometry args={[0.6, 1]} />
      </mesh>
    </group>
  );
}

/** A round stone fountain: a basin with a low rim, water, a fluted column and a small bowl trickling over. */
function Fountain({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, F, z]}>
      <mesh position={[0, 0.22, 0]} material={m.stone}>
        <cylinderGeometry args={[0.95, 1.0, 0.44, 32, 1, true]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneShade}>
        <torusGeometry args={[0.97, 0.06, 8, 40]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]} material={water}>
        <circleGeometry args={[0.94, 32]} />
      </mesh>
      <mesh position={[0, 0.75, 0]} material={m.stone}>
        <cylinderGeometry args={[0.1, 0.16, 0.85, 12]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={m.stone}>
        <cylinderGeometry args={[0.38, 0.12, 0.14, 24]} />
      </mesh>
      <mesh position={[0, 1.27, 0]} rotation={[-Math.PI / 2, 0, 0]} material={water}>
        <circleGeometry args={[0.34, 24]} />
      </mesh>
      {/* the thin veil of water falling from the bowl's lip */}
      <mesh position={[0, 0.82, 0]} material={glass}>
        <cylinderGeometry args={[0.39, 0.5, 0.8, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 1.42, 0]} material={m.brass}>
        <sphereGeometry args={[0.06, 12, 8]} />
      </mesh>
    </group>
  );
}

/** Marble-topped bistro table with a cast-iron foot. */
function BistroTable({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, F, z]}>
      <mesh position={[0, 0.03, 0]} material={iron}>
        <cylinderGeometry args={[0.24, 0.28, 0.06, 16]} />
      </mesh>
      <mesh position={[0, 0.38, 0]} material={iron}>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 8]} />
      </mesh>
      <mesh position={[0, 0.74, 0]} material={m.marble}>
        <cylinderGeometry args={[0.36, 0.36, 0.03, 28]} />
      </mesh>
      <mesh position={[0.08, 0.8, 0.05]} material={m.porcelain}>
        <cylinderGeometry args={[0.04, 0.03, 0.07, 14]} />
      </mesh>
    </group>
  );
}

/** Glass walls: a stone plinth, slim iron mullions every bay, a transom, and clear panes. */
function GlassWall({ len, at, ry }: { len: number; at: [number, number, number]; ry: number }) {
  const m = useMats();
  const bays = Math.max(1, Math.round(len / BAY));
  const bw = len / bays;
  const h = EAVES - PLINTH;
  return (
    <group position={at} rotation={[0, ry, 0]}>
      <mesh position={[len / 2, PLINTH / 2, 0]} material={m.stone}>
        <boxGeometry args={[len, PLINTH, 0.3]} />
      </mesh>
      <mesh position={[len / 2, PLINTH + 0.03, 0]} material={m.stoneShade}>
        <boxGeometry args={[len + 0.1, 0.06, 0.38]} />
      </mesh>
      <mesh position={[len / 2, PLINTH + h / 2, 0]} material={glass}>
        <planeGeometry args={[len, h]} />
      </mesh>
      {Array.from({ length: bays + 1 }, (_, i) => (
        <mesh key={i} position={[i * bw, PLINTH + h / 2, 0]} material={iron}>
          <boxGeometry args={[0.07, h, 0.09]} />
        </mesh>
      ))}
      {[PLINTH + h * 0.72, EAVES - 0.04].map((y) => (
        <mesh key={y} position={[len / 2, y, 0]} material={iron}>
          <boxGeometry args={[len, 0.06, 0.09]} />
        </mesh>
      ))}
      {/* a little arched tracery in each transom light */}
      {Array.from({ length: bays }, (_, i) => (
        <mesh key={`t${i}`} position={[(i + 0.5) * bw, PLINTH + h * 0.72, 0]} material={iron}>
          <torusGeometry args={[bw / 2 - 0.05, 0.016, 4, 20, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
}

/** Pitched glass roof on iron rafters, with a gilt cresting and finials along the ridge. */
function Roof() {
  const m = useMats();
  const half = W / 2;
  const rise = RIDGE - EAVES;
  const slope = Math.hypot(half, rise);
  const pitch = Math.atan2(rise, half);
  const rafters = Math.round(D / BAY);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[MX + (s * half) / 2, EAVES + rise / 2, MZ]} rotation={[0, 0, -s * pitch]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={glass}>
            <planeGeometry args={[slope, D]} />
          </mesh>
          {Array.from({ length: rafters + 1 }, (_, i) => (
            <mesh key={i} position={[0, 0.03, Z0 - MZ - i * (D / rafters)]} material={iron}>
              <boxGeometry args={[slope, 0.06, 0.06]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[MX, RIDGE, MZ]} material={iron}>
        <boxGeometry args={[0.12, 0.12, D + 0.1]} />
      </mesh>
      {Array.from({ length: Math.round(D / 0.6) }, (_, i) => (
        <mesh key={i} position={[MX, RIDGE + 0.14, Z0 - 0.3 - i * 0.6]} rotation={[0, Math.PI / 2, 0]} material={m.gilt}>
          <torusGeometry args={[0.09, 0.012, 4, 12]} />
        </mesh>
      ))}
      {[Z0, Z1].map((z) => (
        <mesh key={z} position={[MX, RIDGE + 0.3, z]} material={m.gilt}>
          <coneGeometry args={[0.06, 0.4, 8]} />
        </mesh>
      ))}
      {/* the gable ends, glazed */}
      {[Z0, Z1].map((z) => (
        <mesh key={`g${z}`} position={[MX, EAVES, z]} material={glass}>
          <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, rise)])]} />
        </mesh>
      ))}
    </group>
  );
}

/** Strings of small glowing lanterns under the glass, so the garden glows after dark. */
function Lanterns() {
  const m = useMats();
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = Z0 - 1.2; z > Z1 + 0.6; z -= 1.6) out.push([MX - 0.9, z], [MX + 0.9, z]);
    return out;
  }, []);
  return (
    <group>
      {spots.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, EAVES + 0.1, z]}>
          <mesh position={[0, 0.3, 0]} material={iron}>
            <cylinderGeometry args={[0.006, 0.006, 0.6, 4]} />
          </mesh>
          <mesh material={m.lanternShade}>
            <sphereGeometry args={[0.08, 12, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The winter garden: a cast-iron glass house in the right-hand garden, opening off the bar salon. Kentia palms in
 * urns, ferns along the glass, a stone fountain, and two marble bistro tables among the plants. The sky, sun and
 * stars of the hour in India show straight through the glass.
 */
export default function WinterGarden() {
  const m = useMats();
  const lux = luxuryMats();
  const floor = useMemo(() => lux.cabochon(W / 1.4, D / 1.4), [lux]);
  const tables: { x: number; z: number }[] = [
    { x: 12.6, z: -28.3 },
    { x: 12.6, z: -30.25 },
  ];
  return (
    <group>
      {/* raised stone floor */}
      <mesh position={[MX, F / 2, MZ]} material={m.stone}>
        <boxGeometry args={[W, F, D]} />
      </mesh>
      <mesh position={[MX, F + 0.003, MZ]} rotation={[-Math.PI / 2, 0, 0]} material={floor}>
        <planeGeometry args={[W - 0.3, D - 0.3]} />
      </mesh>

      {/* glass on three sides; the fourth is the salon's wall */}
      <GlassWall len={D} at={[X1, 0, Z0]} ry={Math.PI / 2} />
      <GlassWall len={W} at={[X0, 0, Z0]} ry={0} />
      <GlassWall len={W} at={[X0, 0, Z1]} ry={0} />
      <Roof />
      <Lanterns />

      <Fountain x={MX + 0.1} z={-25.9} />
      <Palm x={X0 + 0.7} z={Z0 - 0.7} s={1.15} />
      <Palm x={X1 - 0.7} z={Z0 - 0.7} />
      <Palm x={X1 - 0.7} z={Z1 + 0.7} s={1.2} />
      <Palm x={X0 + 0.7} z={Z1 + 0.7} />
      {[-24.4, -27.4].map((z) => (
        <Fern key={z} x={X1 - 0.45} z={z} />
      ))}

      {tables.map((t) => (
        <group key={t.z}>
          <BistroTable x={t.x} z={t.z} />
          <group position={[0, F, 0]}>
            <ChairMesh chair={{ id: `w${t.z}a`, x: t.x - 0.75, z: t.z, rot: Math.PI / 2, outdoor: true }} />
            <ChairMesh chair={{ id: `w${t.z}b`, x: t.x + 0.75, z: t.z, rot: -Math.PI / 2, outdoor: true }} />
          </group>
        </group>
      ))}
      <GroupLight group="exterior" color="#ffd7a0" intensity={4} distance={8} decay={2} position={[MX, EAVES - 0.4, MZ]} />

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[W / 2, F / 2, D / 2]} position={[MX, F / 2, MZ]} />
        <CuboidCollider args={[0.15, 2, D / 2]} position={[X1, F + 2, MZ]} />
        <CuboidCollider args={[W / 2, 2, 0.15]} position={[MX, F + 2, Z0]} />
        <CuboidCollider args={[W / 2, 2, 0.15]} position={[MX, F + 2, Z1]} />
        <CylinderCollider args={[0.7, 1.05]} position={[MX + 0.1, F + 0.7, -25.9]} />
        {tables.map((t) => (
          <CuboidCollider key={t.z} args={[1.0, 0.5, 0.45]} position={[t.x, F + 0.5, t.z]} />
        ))}
      </RigidBody>
    </group>
  );
}
