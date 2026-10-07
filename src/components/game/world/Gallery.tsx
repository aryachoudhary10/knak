"use client";

import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { GALLERY } from "@/game/layout";

const { x0: X0, x1: X1, z0: Z0, z1: Z1, deck: Y, stairX: SX, stairHalf: SH, stairFoot: SF } = GALLERY;
const SLAB = 0.3;
const RAIL = 1.0;
const RUN = Z1 - SF; // stairs climb toward the entrance, from the foot at SF up to the gallery edge at Z1
const STEPS = 20;
const RISE = Y / STEPS;
const TREAD = RUN / STEPS;
const COLUMNS = [-6.0, -2.0, 2.0, 6.0];
const TABLES = [-5.0, -1.6, 1.2, 5.6];

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
 * down over the chandeliers, reached by a straight flight of walnut and marble stairs up the right-hand aisle.
 */
export default function Gallery() {
  const m = useMats();
  const front = (Z0 + Z1) / 2;
  const depth = Z0 - Z1;
  const angle = Math.atan2(Y, RUN);
  const len = Math.hypot(Y, RUN);
  const treads = useMemo(() => Array.from({ length: STEPS }, (_, i) => i), []);
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
      <Balustrade len={SX - SH - X0} from={[X0, Y, Z1 + 0.05]} />
      <Balustrade len={X1 - (SX + SH)} from={[SX + SH, Y, Z1 + 0.05]} />
      {[X0 + 0.05, X1 - 0.05].map((x) => (
        <group key={x} position={[x, 0, Z0]} rotation={[0, Math.PI / 2, 0]}>
          <Balustrade len={depth} from={[0, Y, 0]} />
        </group>
      ))}

      {TABLES.map((x) => (
        <TableForTwo key={x} x={x} />
      ))}

      {/* the stairs: marble treads on a walnut stringer either side, brass balustrades */}
      {treads.map((i) => (
        <mesh key={i} position={[SX, (i + 1) * RISE - 0.03, SF + (i + 0.5) * TREAD]} material={m.marble}>
          <boxGeometry args={[SH * 2, 0.06, TREAD + 0.03]} />
        </mesh>
      ))}
      {treads.map((i) => (
        <mesh key={`r${i}`} position={[SX, (i + 0.5) * RISE, SF + i * TREAD + 0.01]} material={m.darkWood}>
          <boxGeometry args={[SH * 2 - 0.02, RISE, 0.03]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[SX + s * (SH + 0.04), Y / 2 - 0.1, (SF + Z1) / 2]} rotation={[-angle, 0, 0]} material={m.walnut}>
            <boxGeometry args={[0.08, 0.32, len]} />
          </mesh>
          <mesh position={[SX + s * (SH + 0.04), Y / 2 + 0.9, (SF + Z1) / 2]} rotation={[Math.PI / 2 - angle, 0, 0]} material={m.brass}>
            <cylinderGeometry args={[0.028, 0.028, len, 10]} />
          </mesh>
          {treads
            .filter((i) => i % 2 === 0)
            .map((i) => (
              <mesh key={i} position={[SX + s * (SH + 0.04), (i + 1) * RISE + 0.45, SF + (i + 0.5) * TREAD]} material={m.blackIron}>
                <cylinderGeometry args={[0.012, 0.012, 0.9, 5]} />
              </mesh>
            ))}
          {/* newel post at the foot */}
          <mesh position={[SX + s * (SH + 0.04), 0.55, SF + 0.05]} material={m.brass}>
            <cylinderGeometry args={[0.05, 0.07, 1.1, 12]} />
          </mesh>
          <mesh position={[SX + s * (SH + 0.04), 1.13, SF + 0.05]} material={m.brass}>
            <sphereGeometry args={[0.07, 14, 10]} />
          </mesh>
        </group>
      ))}

      <RigidBody type="fixed" colliders={false}>
        {/* stair ramp, climbing toward +z */}
        <CuboidCollider
          args={[SH, 0.05, len / 2 + 0.15]}
          position={[SX, Y / 2 - Math.cos(angle) * 0.05, (SF + Z1) / 2 + Math.sin(angle) * 0.05]}
          rotation={[-angle, 0, 0]}
        />
        {/* stair sides, so a guest doesn't step off halfway up */}
        {[-1, 1].map((s) => (
          <CuboidCollider key={s} args={[0.04, 0.6, len / 2]} position={[SX + s * (SH + 0.06), Y / 2 + 0.55, (SF + Z1) / 2]} rotation={[-angle, 0, 0]} />
        ))}
        {/* deck and balustrades */}
        <CuboidCollider args={[(X1 - X0) / 2, SLAB / 2, depth / 2]} position={[0, Y - SLAB / 2, front]} />
        <CuboidCollider args={[(SX - SH - X0) / 2, 0.6, 0.05]} position={[(X0 + SX - SH) / 2, Y + 0.6, Z1 + 0.05]} />
        <CuboidCollider args={[(X1 - SX - SH) / 2, 0.6, 0.05]} position={[(SX + SH + X1) / 2, Y + 0.6, Z1 + 0.05]} />
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
