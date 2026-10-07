"use client";

import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { GALLERY, SPIRAL } from "@/game/layout";

const { x0: X0, x1: X1, z0: Z0, z1: Z1, deck: Y } = GALLERY;
const SLAB = 0.22;
const RAIL = 1.0;
const COLUMNS = [-6.0, -2.0, 2.0, 6.0];
const TABLES = [-1.8, 1.4, 4.4];
/** The landing between the top of the round staircase and the gallery's edge. */
const LAND = { x0: SPIRAL.x - SPIRAL.r, x1: SPIRAL.x - 0.2, z0: SPIRAL.z, z1: Z1 } as const;
const TREAD_ANGLE = (Math.PI * 2) / SPIRAL.treads;
const RISE = Y / SPIRAL.treads;

/** Point on the staircase at radius r after `turn` radians from its foot. */
const onSpiral = (r: number, turn: number, y: number): [number, number, number] => {
  const b = SPIRAL.start + turn;
  return [SPIRAL.x + Math.sin(b) * r, y, SPIRAL.z + Math.cos(b) * r];
};

/**
 * The round staircase: one full turn of marble treads cantilevered from a gilt newel, a walnut soffit under each,
 * and a brass handrail spiralling up on slim iron balusters.
 */
function RoundStair() {
  const m = useMats();
  const treads = useMemo(() => Array.from({ length: SPIRAL.treads }, (_, i) => i), []);
  const rail = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(...onSpiral(SPIRAL.r - 0.06, t, (Y * t) / (Math.PI * 2) + 0.95)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.026, 8, false);
  }, []);
  return (
    <group>
      {treads.map((i) => (
        <group key={i}>
          <mesh position={[SPIRAL.x, (i + 1) * RISE - 0.03, SPIRAL.z]} material={m.marble} castShadow>
            <cylinderGeometry args={[SPIRAL.r, SPIRAL.r, 0.06, 6, 1, false, SPIRAL.start + i * TREAD_ANGLE, TREAD_ANGLE * 1.02]} />
          </mesh>
          <mesh position={[SPIRAL.x, (i + 1) * RISE - 0.09, SPIRAL.z]} material={m.walnut}>
            <cylinderGeometry args={[SPIRAL.r - 0.05, SPIRAL.r - 0.05, 0.06, 6, 1, false, SPIRAL.start + i * TREAD_ANGLE, TREAD_ANGLE * 1.02]} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={onSpiral(SPIRAL.r - 0.06, (i + 0.5) * TREAD_ANGLE, (i + 1) * RISE + 0.47)} material={m.blackIron}>
              <cylinderGeometry args={[0.011, 0.011, 0.94, 5]} />
            </mesh>
          )}
        </group>
      ))}
      <mesh geometry={rail} material={m.brass} />
      {/* the newel: a slim gilt column ringed in brass, crowned with a finial above the gallery */}
      <mesh position={[SPIRAL.x, (Y + 1.1) / 2, SPIRAL.z]} material={m.gilt}>
        <cylinderGeometry args={[SPIRAL.core * 0.6, SPIRAL.core * 0.75, Y + 1.1, 16]} />
      </mesh>
      {[0.6, 1.8, 3.0, 4.2].map((y) => (
        <mesh key={y} position={[SPIRAL.x, y, SPIRAL.z]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
          <torusGeometry args={[SPIRAL.core * 0.75, 0.03, 6, 20]} />
        </mesh>
      ))}
      <mesh position={[SPIRAL.x, Y + 1.25, SPIRAL.z]} material={m.gilt}>
        <sphereGeometry args={[0.12, 16, 12]} />
      </mesh>
      <mesh position={[SPIRAL.x, 0.08, SPIRAL.z]} material={m.marble}>
        <cylinderGeometry args={[0.4, 0.45, 0.16, 20]} />
      </mesh>
      {/* landing over to the gallery */}
      <mesh position={[(LAND.x0 + LAND.x1) / 2, Y - SLAB / 2, (LAND.z0 + LAND.z1) / 2]} material={m.panel}>
        <boxGeometry args={[LAND.x1 - LAND.x0, SLAB, LAND.z1 - LAND.z0]} />
      </mesh>
      <mesh position={[(LAND.x0 + LAND.x1) / 2, Y + 0.006, (LAND.z0 + LAND.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m.walnut}>
        <planeGeometry args={[LAND.x1 - LAND.x0, LAND.z1 - LAND.z0]} />
      </mesh>
    </group>
  );
}

/** A gilt iron balustrade with a brass handrail, along local +x from 0 to len. */
function Balustrade({ len, from }: { len: number; from: [number, number, number] }) {
  const m = useMats();
  const posts = Math.max(2, Math.round(len / 0.14));
  return (
    <group position={from}>
      <mesh position={[len / 2, RAIL, 0]} rotation={[0, 0, Math.PI / 2]} material={m.brass}>
        <cylinderGeometry args={[0.03, 0.03, len, 10]} />
      </mesh>
      <mesh position={[len / 2, 0.08, 0]} material={m.blackIron}>
        <boxGeometry args={[len, 0.04, 0.05]} />
      </mesh>
      <mesh position={[len / 2, RAIL - 0.12, 0]} material={m.blackIron}>
        <boxGeometry args={[len, 0.03, 0.04]} />
      </mesh>
      <instancedMesh
        args={[undefined, undefined, posts]}
        material={m.blackIron}
        ref={(im) => {
          if (!im) return;
          const mat = new THREE.Matrix4();
          for (let i = 0; i < posts; i++) im.setMatrixAt(i, mat.makeTranslation((i + 0.5) * (len / posts), (RAIL - 0.04) / 2 + 0.06, 0));
          im.instanceMatrix.needsUpdate = true;
        }}
      >
        <cylinderGeometry args={[0.009, 0.009, RAIL - 0.16, 5]} />
      </instancedMesh>
      {/* gilt scroll every few posts */}
      {Array.from({ length: Math.floor(len / 0.9) }, (_, i) => (
        <mesh key={i} position={[(i + 0.5) * (len / Math.floor(len / 0.9)), 0.48, 0]} rotation={[0, Math.PI / 2, 0]} material={m.gilt}>
          <torusGeometry args={[0.13, 0.012, 6, 18]} />
        </mesh>
      ))}
    </group>
  );
}

function TableForTwo({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, Y, (Z0 + Z1) / 2]}>
      <mesh position={[0, 0.37, 0]} material={m.brass}>
        <cylinderGeometry args={[0.035, 0.05, 0.72, 10]} />
      </mesh>
      <mesh position={[0, 0.74, 0]} material={m.linen}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 28]} />
      </mesh>
      <mesh position={[0, 0.92, 0]} material={m.lampShade}>
        <cylinderGeometry args={[0.05, 0.085, 0.11, 12, 1, true]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} material={m.brass}>
        <cylinderGeometry args={[0.008, 0.01, 0.16, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.75, 0, 0]} rotation={[0, (-s * Math.PI) / 2, 0]}>
          <mesh position={[0, 0.46, 0]} material={m.burgundy}>
            <boxGeometry args={[0.46, 0.08, 0.44]} />
          </mesh>
          <mesh position={[0, 0.8, -0.2]} material={m.burgundy}>
            <boxGeometry args={[0.44, 0.6, 0.06]} />
          </mesh>
          {[-1, 1].map((a) =>
            [-1, 1].map((b) => (
              <mesh key={`${a}${b}`} position={[a * 0.19, 0.21, b * 0.18]} material={m.darkWood}>
                <boxGeometry args={[0.04, 0.42, 0.04]} />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * The gallery: a balcony over the entrance carried on slender gilt columns, with a few tables for two that look
 * down over the chandeliers, reached by a round marble staircase at its left end.
 */
export default function Gallery() {
  const m = useMats();
  const front = (Z0 + Z1) / 2;
  const depth = Z0 - Z1;
  return (
    <group>
      {/* deck: walnut floor, cream soffit with a gilt edge and little glowing discs */}
      <mesh position={[0, Y - SLAB / 2, front]} material={m.panel} castShadow>
        <boxGeometry args={[X1 - X0, SLAB, depth]} />
      </mesh>
      <mesh position={[0, Y + 0.005, front]} rotation={[-Math.PI / 2, 0, 0]} material={m.walnut}>
        <planeGeometry args={[X1 - X0, depth]} />
      </mesh>
      <mesh position={[0, Y - SLAB / 2, Z1 - 0.02]} material={m.gilt}>
        <boxGeometry args={[X1 - X0 + 0.06, SLAB + 0.04, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (X1 + 0.02), Y - SLAB / 2, front]} material={m.gilt}>
          <boxGeometry args={[0.05, SLAB + 0.04, depth]} />
        </mesh>
      ))}
      {[-4.8, -1.6, 1.6, 4.8].map((x) => (
        <mesh key={x} position={[x, Y - SLAB - 0.01, front]} rotation={[Math.PI / 2, 0, 0]} material={m.bulb}>
          <circleGeometry args={[0.06, 16]} />
        </mesh>
      ))}

      {/* columns with gilt capitals */}
      {COLUMNS.map((x) => (
        <group key={x} position={[x, 0, Z1 + 0.25]}>
          <mesh position={[0, (Y - SLAB) / 2, 0]} material={m.panel}>
            <cylinderGeometry args={[0.11, 0.13, Y - SLAB, 16]} />
          </mesh>
          <mesh position={[0, Y - SLAB - 0.12, 0]} material={m.gilt}>
            <cylinderGeometry args={[0.2, 0.12, 0.24, 16]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={m.gilt}>
            <cylinderGeometry args={[0.18, 0.2, 0.2, 16]} />
          </mesh>
        </group>
      ))}

      {/* balustrade along the front, open where the stairs arrive, and down both ends */}
      <Balustrade len={LAND.x0 - X0} from={[X0, Y, Z1 + 0.05]} />
      <Balustrade len={X1 - LAND.x1} from={[LAND.x1, Y, Z1 + 0.05]} />
      {[X0 + 0.05, X1 - 0.05].map((x) => (
        <group key={x} position={[x, 0, Z0]} rotation={[0, Math.PI / 2, 0]}>
          <Balustrade len={depth} from={[0, Y, 0]} />
        </group>
      ))}

      {TABLES.map((x) => (
        <TableForTwo key={x} x={x} />
      ))}

      <RoundStair />
      {/* rails along both open sides of the landing */}
      {[LAND.x0, LAND.x1].map((x) => (
        <group key={x} position={[x, 0, LAND.z1]} rotation={[0, Math.PI / 2, 0]}>
          <Balustrade len={LAND.z1 - LAND.z0} from={[0, Y, 0]} />
        </group>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {/* the round staircase: its treads are followed in Player; here only the newel, the outer guard and the landing */}
        <CylinderCollider args={[(Y + 1.1) / 2, SPIRAL.core]} position={[SPIRAL.x, (Y + 1.1) / 2, SPIRAL.z]} />
        {Array.from({ length: SPIRAL.treads }, (_, i) => {
          const t = (i + 0.5) * TREAD_ANGLE;
          const [x, , z] = onSpiral(SPIRAL.r + 0.05, t, 0);
          return (
            <CuboidCollider
              key={i}
              args={[0.05, 0.6, SPIRAL.r * TREAD_ANGLE * 0.55]}
              position={[x, (i + 1) * RISE + 0.6, z]}
              rotation={[0, SPIRAL.start + t + Math.PI / 2, 0]}
            />
          );
        })}
        <CuboidCollider args={[(LAND.x1 - LAND.x0) / 2, SLAB / 2, (LAND.z1 - LAND.z0) / 2]} position={[(LAND.x0 + LAND.x1) / 2, Y - SLAB / 2, (LAND.z0 + LAND.z1) / 2]} />
        {[LAND.x0, LAND.x1].map((x) => (
          <CuboidCollider key={`lr${x}`} args={[0.05, 0.6, (LAND.z1 - LAND.z0) / 2]} position={[x, Y + 0.6, (LAND.z0 + LAND.z1) / 2]} />
        ))}
        {/* deck and balustrades */}
        <CuboidCollider args={[(X1 - X0) / 2, SLAB / 2, depth / 2]} position={[0, Y - SLAB / 2, front]} />
        <CuboidCollider args={[(LAND.x0 - X0) / 2, 0.6, 0.05]} position={[(X0 + LAND.x0) / 2, Y + 0.6, Z1 + 0.05]} />
        <CuboidCollider args={[(X1 - LAND.x1) / 2, 0.6, 0.05]} position={[(LAND.x1 + X1) / 2, Y + 0.6, Z1 + 0.05]} />
        {[X0, X1].map((x) => (
          <CuboidCollider key={x} args={[0.05, 0.6, depth / 2]} position={[x, Y + 0.6, front]} />
        ))}
        {COLUMNS.map((x) => (
          <CylinderCollider key={x} args={[(Y - SLAB) / 2, 0.15]} position={[x, (Y - SLAB) / 2, Z1 + 0.25]} />
        ))}
      </RigidBody>
    </group>
  );
}
