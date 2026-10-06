"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { signTexture } from "@/game/textures";
import { DOOR, FACADE } from "@/game/layout";
import { runtime } from "@/game/runtime";
import { doorChime } from "@/game/audio";

const H = FACADE.height;
const W = FACADE.halfWidth;
const T = FACADE.thickness;

function Pilaster({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 3.15, 0.12]} castShadow receiveShadow material={m.stone}>
        <boxGeometry args={[0.7, 6.3, 0.25]} />
      </mesh>
      {/* recessed panel */}
      <mesh position={[0, 3.3, 0.25]} material={m.stoneShade}>
        <boxGeometry args={[0.42, 4.6, 0.02]} />
      </mesh>
      {/* Corinthian-ish capital: stacked flared blocks with gilt band */}
      <mesh position={[0, 6.42, 0.18]} material={m.stone}>
        <boxGeometry args={[0.9, 0.25, 0.38]} />
      </mesh>
      <mesh position={[0, 6.62, 0.2]} material={m.stoneShade}>
        <boxGeometry args={[1.0, 0.18, 0.44]} />
      </mesh>
      <mesh position={[0, 6.32, 0.31]} material={m.gilt}>
        <boxGeometry args={[0.72, 0.04, 0.02]} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, 0.3, 0.16]} material={m.stoneShade}>
        <boxGeometry args={[0.85, 0.6, 0.34]} />
      </mesh>
    </group>
  );
}

function ArchedWindow({ x }: { x: number }) {
  const m = useMats();
  const w = 1.8;
  const h = 3.4;
  const y0 = 1.0;
  return (
    <group position={[x, 0, 0.02]}>
      <mesh position={[0, y0 + h / 2, 0]} material={m.glassWarm}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, y0 + h, 0]} material={m.glassWarm}>
        <circleGeometry args={[w / 2, 32, 0, Math.PI]} />
      </mesh>
      {/* frame + muntins */}
      {[-w / 2, 0, w / 2].map((dx) => (
        <mesh key={dx} position={[dx, y0 + h / 2, 0.03]} material={m.stone}>
          <boxGeometry args={[0.07, h, 0.06]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, y0 + (i * h) / 3, 0.03]} material={m.stone}>
          <boxGeometry args={[w, 0.07, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, y0 + h, 0.03]} rotation={[0, 0, 0]} material={m.stone}>
        <torusGeometry args={[w / 2 + 0.05, 0.08, 8, 32, Math.PI]} />
      </mesh>
      {/* sill */}
      <mesh position={[0, y0 - 0.08, 0.1]} material={m.stoneShade}>
        <boxGeometry args={[w + 0.4, 0.14, 0.24]} />
      </mesh>
    </group>
  );
}

function Lantern({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, 2.75, 0.2]}>
      {/* swan-neck bracket */}
      <mesh position={[0, 0.55, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={m.blackIron}>
        <torusGeometry args={[0.18, 0.025, 8, 16, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.25, 0.3]} material={m.blackIron}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
      </mesh>
      <group position={[0, 0, 0.3]}>
        <mesh position={[0, 0.12, 0]} material={m.blackIron}>
          <coneGeometry args={[0.2, 0.18, 4]} />
        </mesh>
        <mesh position={[0, -0.15, 0]} material={m.glassWarm}>
          <cylinderGeometry args={[0.15, 0.11, 0.38, 4]} />
        </mesh>
        <mesh position={[0, -0.36, 0]} material={m.blackIron}>
          <coneGeometry args={[0.06, 0.12, 4]} />
        </mesh>
      </group>
    </group>
  );
}

function Topiary({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, 0.75]}>
      <mesh position={[0, 0.12, 0]} material={m.stoneShade}>
        <cylinderGeometry args={[0.24, 0.28, 0.24, 20]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={m.stone}>
        <cylinderGeometry args={[0.4, 0.22, 0.62, 20]} />
      </mesh>
      <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneShade}>
        <torusGeometry args={[0.4, 0.04, 8, 24]} />
      </mesh>
      <mesh position={[0, 1.45, 0]} scale={[1, 1.35, 1]} material={m.leaf}>
        <icosahedronGeometry args={[0.48, 2]} />
      </mesh>
    </group>
  );
}

function DoorLeaf({ side }: { side: -1 | 1 }) {
  const m = useMats();
  const ref = useRef<THREE.Group>(null);
  const open = useRef(0);
  const w = DOOR.halfWidth;
  const h = DOOR.height;
  useFrame((_, dt) => {
    const p = runtime.playerPos;
    const near = Math.hypot(p.x, p.z + 0.2) < 4.2;
    const before = open.current;
    open.current = THREE.MathUtils.damp(open.current, near ? 1 : 0, 3.2, dt);
    if (side < 0 && before < 0.05 && open.current >= 0.05) doorChime();
    if (ref.current) ref.current.rotation.y = -side * open.current * 1.45;
  });
  // side = -1 is the left leaf hinged at x = -w, extending toward +x.
  const dir = -side;
  return (
    <group ref={ref} position={[side * w, 0, -T / 2]}>
      <group position={[(dir * w) / 2, 0, 0]}>
        {/* lower panel */}
        <mesh position={[0, 0.55, 0]} material={m.stone}>
          <boxGeometry args={[w - 0.02, 1.1, 0.07]} />
        </mesh>
        <mesh position={[0, 0.55, 0.04]} material={m.stoneShade}>
          <boxGeometry args={[w - 0.3, 0.75, 0.01]} />
        </mesh>
        {/* glazing */}
        <mesh position={[0, 1.1 + (h - 1.1) / 2, 0]} material={m.glassDim}>
          <boxGeometry args={[w - 0.1, h - 1.2, 0.02]} />
        </mesh>
        {[-1, 0, 1].map((i) => (
          <mesh key={`v${i}`} position={[(i * (w - 0.04)) / 2, 1.1 + (h - 1.1) / 2, 0.02]} material={m.stone}>
            <boxGeometry args={[0.07, h - 1.1, 0.06]} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`h${i}`} position={[0, 1.1 + (i * (h - 1.1)) / 3, 0.02]} material={m.stone}>
            <boxGeometry args={[w - 0.02, 0.07, 0.06]} />
          </mesh>
        ))}
        {/* brass pull */}
        <mesh position={[dir * (w / 2 - 0.12), 1.15, 0.08]} material={m.brass}>
          <boxGeometry args={[0.04, 0.42, 0.04]} />
        </mesh>
      </group>
    </group>
  );
}

export default function Facade() {
  const m = useMats();
  const sign = useMemo(() => signTexture(), []);
  const pieceW = W - DOOR.halfWidth;
  return (
    <group>
      {/* Wall pieces either side of the doorway, and above it */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[pieceW / 2, H / 2, T / 2]} position={[-(DOOR.halfWidth + pieceW / 2), H / 2, -T / 2]} />
        <CuboidCollider args={[pieceW / 2, H / 2, T / 2]} position={[DOOR.halfWidth + pieceW / 2, H / 2, -T / 2]} />
      </RigidBody>
      <mesh position={[-(DOOR.halfWidth + pieceW / 2), H / 2, -T / 2]} receiveShadow material={m.stone}>
        <boxGeometry args={[pieceW, H, T]} />
      </mesh>
      <mesh position={[DOOR.halfWidth + pieceW / 2, H / 2, -T / 2]} receiveShadow material={m.stone}>
        <boxGeometry args={[pieceW, H, T]} />
      </mesh>
      <mesh position={[0, (H + DOOR.height) / 2, -T / 2]} material={m.stone}>
        <boxGeometry args={[DOOR.halfWidth * 2, H - DOOR.height, T]} />
      </mesh>

      {/* Fanlight above the doors */}
      <group position={[0, DOOR.height + 0.05, 0.01]}>
        <mesh material={m.glassWarm}>
          <circleGeometry args={[DOOR.halfWidth, 40, 0, Math.PI]} />
        </mesh>
        {[0.25, 0.5, 0.75].map((f) => (
          <mesh key={f} position={[Math.cos(f * Math.PI) * 0.6, Math.sin(f * Math.PI) * 0.6, 0.02]} rotation={[0, 0, f * Math.PI]} material={m.stone}>
            <boxGeometry args={[1.2, 0.05, 0.04]} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.02]} material={m.stone}>
          <torusGeometry args={[0.55, 0.035, 6, 24, Math.PI]} />
        </mesh>
        <mesh position={[0, 0, 0.02]} material={m.stone}>
          <boxGeometry args={[DOOR.halfWidth * 2, 0.08, 0.06]} />
        </mesh>
        {/* archivolt */}
        <mesh position={[0, 0, 0.06]} material={m.stoneShade}>
          <torusGeometry args={[DOOR.halfWidth + 0.14, 0.13, 10, 40, Math.PI]} />
        </mesh>
        {/* keystone */}
        <mesh position={[0, DOOR.halfWidth + 0.18, 0.12]} material={m.stone}>
          <boxGeometry args={[0.36, 0.5, 0.2]} />
        </mesh>
      </group>
      {/* door architrave */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR.halfWidth + 0.12), DOOR.height / 2, 0.05]} material={m.stoneShade}>
          <boxGeometry args={[0.24, DOOR.height, 0.12]} />
        </mesh>
      ))}

      <DoorLeaf side={-1} />
      <DoorLeaf side={1} />

      {/* Pilasters */}
      {[-8.3, -2.35, 2.35, 8.3].map((x) => (
        <Pilaster key={x} x={x} />
      ))}

      <ArchedWindow x={-5.3} />
      <ArchedWindow x={5.3} />

      {/* Entablature, frieze with the KNAK sign, cornice */}
      <mesh position={[0, 6.86, 0.18]} material={m.stone}>
        <boxGeometry args={[W * 2, 0.22, 0.4]} />
      </mesh>
      <mesh position={[0, 7.4, 0.04]} material={m.stone}>
        <boxGeometry args={[W * 2, 0.86, 0.12]} />
      </mesh>
      <mesh position={[0, 7.4, 0.12]} material={m.stoneShade}>
        <boxGeometry args={[5.2, 0.7, 0.03]} />
      </mesh>
      <mesh position={[0, 7.4, 0.14]}>
        <planeGeometry args={[4.6, 1.15]} />
        <meshStandardMaterial map={sign} transparent metalness={0.7} roughness={0.3} emissive="#6b4a12" emissiveMap={sign} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 7.95, 0.28]} material={m.stone}>
        <boxGeometry args={[W * 2 + 0.4, 0.3, 0.6]} />
      </mesh>
      <mesh position={[0, 8.12, 0.36]} material={m.stoneShade}>
        <boxGeometry args={[W * 2 + 0.6, 0.12, 0.76]} />
      </mesh>
      {/* base course */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR.halfWidth + 0.24 + pieceW / 2), 0.22, 0.06]} material={m.stoneShade}>
          <boxGeometry args={[pieceW - 0.24, 0.44, 0.12]} />
        </mesh>
      ))}

      <Lantern x={-1.85} />
      <Lantern x={1.85} />
      <Topiary x={-1.95} />
      <Topiary x={1.95} />
    </group>
  );
}
