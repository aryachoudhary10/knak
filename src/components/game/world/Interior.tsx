"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { windowViewTexture } from "@/game/textures";
import { DOOR, ROOM } from "@/game/layout";

const W = ROOM.maxX - ROOM.minX;
const D = ROOM.maxZ - ROOM.minZ;
const CZ = (ROOM.maxZ + ROOM.minZ) / 2;
const H = ROOM.height;

function Chandelier({ position, light = true }: { position: [number, number, number]; light?: boolean }) {
  const m = useMats();
  const flicker = useRef<THREE.PointLight>(null);
  const seed = position[2];
  useFrame(({ clock }) => {
    if (flicker.current) {
      const t = clock.elapsedTime + seed;
      flicker.current.intensity = 34 + Math.sin(t * 7.3) * 1.2 + Math.sin(t * 3.1) * 0.8;
    }
  });
  const arms = 10;
  return (
    <group position={position}>
      <mesh position={[0, (H - position[1]) / 2, 0]} material={m.brass}>
        <cylinderGeometry args={[0.015, 0.015, H - position[1]]} />
      </mesh>
      {/* crystal body: tiers of tapered beaded drums */}
      <mesh position={[0, 0.55, 0]} material={m.crystal}>
        <cylinderGeometry args={[0.25, 0.55, 0.5, 18, 1, true]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={m.crystal}>
        <cylinderGeometry args={[0.6, 0.45, 0.5, 18, 1, true]} />
      </mesh>
      <mesh position={[0, -0.42, 0]} material={m.crystal}>
        <coneGeometry args={[0.45, 0.6, 18, 1, true]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
        <torusGeometry args={[0.6, 0.025, 6, 32]} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
        <torusGeometry args={[0.47, 0.02, 6, 32]} />
      </mesh>
      {Array.from({ length: arms }, (_, i) => {
        const a = (i / arms) * Math.PI * 2;
        const x = Math.cos(a) * 0.78;
        const z = Math.sin(a) * 0.78;
        return (
          <group key={i} position={[x, 0.3, z]}>
            <mesh position={[0, 0.08, 0]} material={m.linen}>
              <cylinderGeometry args={[0.022, 0.022, 0.16, 8]} />
            </mesh>
            <mesh position={[0, 0.19, 0]} material={m.flame}>
              <sphereGeometry args={[0.03, 8, 8]} />
            </mesh>
            <mesh position={[0, -0.01, 0]} material={m.brass}>
              <cylinderGeometry args={[0.05, 0.03, 0.04, 8]} />
            </mesh>
          </group>
        );
      })}
      {light && <pointLight ref={flicker} color="#ffc98a" intensity={34} distance={16} decay={1.6} position={[0, 0.1, 0]} />}
    </group>
  );
}

function Mirror({ x, z, facing, width = 1.5, height = 3.0, y = 1.4 }: { x: number; z: number; facing: 1 | -1; width?: number; height?: number; y?: number }) {
  const m = useMats();
  return (
    <group position={[x, y, z]} rotation={[0, (facing * Math.PI) / 2, 0]}>
      <mesh position={[0, height / 2, 0]} material={m.gilt}>
        <boxGeometry args={[width + 0.24, height + 0.2, 0.06]} />
      </mesh>
      <mesh position={[0, height, 0]} material={m.gilt}>
        <circleGeometry args={[width / 2 + 0.12, 32, 0, Math.PI]} />
      </mesh>
      <mesh position={[0, height / 2, 0.035]} material={m.mirror}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, height, 0.035]} material={m.mirror}>
        <circleGeometry args={[width / 2, 32, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

function TallWindow({ z }: { z: number }) {
  const m = useMats();
  const view = useMemo(() => windowViewTexture(), []);
  const w = 1.6;
  const h = 3.6;
  return (
    <group position={[ROOM.minX + 0.01, 1.1, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={view} toneMapped={false} />
      </mesh>
      <mesh position={[0, h, 0]}>
        <circleGeometry args={[w / 2, 24, 0, Math.PI]} />
        <meshBasicMaterial color="#3a4766" />
      </mesh>
      {[-w / 2, 0, w / 2].map((dx) => (
        <mesh key={dx} position={[dx, h / 2, 0.03]} material={m.darkWood}>
          <boxGeometry args={[0.07, h, 0.06]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, (i * h) / 4, 0.03]} material={m.darkWood}>
          <boxGeometry args={[w, 0.06, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, h, 0.03]} material={m.darkWood}>
        <torusGeometry args={[w / 2, 0.05, 6, 24, Math.PI]} />
      </mesh>
      {/* curtains */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.28), h / 2 + 0.4, 0.15]} material={m.curtain}>
          <cylinderGeometry args={[0.2, 0.3, h + 0.9, 10]} />
        </mesh>
      ))}
    </group>
  );
}

function Sconce({ x, z, facing }: { x: number; z: number; facing: 1 | -1 }) {
  const m = useMats();
  return (
    <group position={[x, 2.4, z]} rotation={[0, (facing * Math.PI) / 2, 0]}>
      <mesh position={[0, 0, 0.02]} material={m.brass}>
        <boxGeometry args={[0.12, 0.3, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.14, 0.12, 0.14]}>
          <mesh material={m.linen}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={m.flame}>
            <coneGeometry args={[0.07, 0.14, 12, 1, true]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Banquette() {
  const m = useMats();
  const z0 = -1.9;
  const z1 = -13.6;
  const len = z0 - z1;
  const cz = (z0 + z1) / 2;
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.4, 0.5, len / 2]} position={[7.6, 0.5, cz]} />
      </RigidBody>
      <mesh position={[7.45, 0.22, cz]} material={m.darkWood}>
        <boxGeometry args={[0.95, 0.44, len]} />
      </mesh>
      <mesh position={[7.4, 0.5, cz]} material={m.burgundy}>
        <boxGeometry args={[0.9, 0.14, len]} />
      </mesh>
      <mesh position={[7.85, 1.05, cz]} rotation={[0, 0, 0.08]} material={m.burgundy}>
        <boxGeometry args={[0.24, 1.0, len]} />
      </mesh>
      {/* tufting channels */}
      {Array.from({ length: Math.floor(len / 0.5) }, (_, i) => (
        <mesh key={i} position={[7.72, 1.05, z1 + 0.25 + i * 0.5]} material={m.darkWood}>
          <boxGeometry args={[0.02, 0.9, 0.02]} />
        </mesh>
      ))}
      <mesh position={[7.9, 1.6, cz]} material={m.darkWood}>
        <boxGeometry args={[0.2, 0.08, len]} />
      </mesh>
    </group>
  );
}

export default function Interior() {
  const m = useMats();
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, CZ]} receiveShadow material={m.checker}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* ceiling with gilt cornice */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, CZ]} material={m.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {[ROOM.minX + 0.1, ROOM.maxX - 0.1].map((x) => (
        <mesh key={x} position={[x, H - 0.2, CZ]} material={m.gilt}>
          <boxGeometry args={[0.2, 0.4, D]} />
        </mesh>
      ))}
      <mesh position={[0, H - 0.2, ROOM.minZ + 0.1]} material={m.gilt}>
        <boxGeometry args={[W, 0.4, 0.2]} />
      </mesh>
      <mesh position={[0, H - 0.2, ROOM.maxZ - 0.5]} material={m.gilt}>
        <boxGeometry args={[W, 0.4, 0.2]} />
      </mesh>
      {/* ceiling coffer frame */}
      <mesh position={[0, H - 0.04, CZ]} material={m.gilt}>
        <boxGeometry args={[W - 3, 0.06, 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 1.5), H - 0.04, CZ]} material={m.gilt}>
          <boxGeometry args={[0.12, 0.06, D - 3]} />
        </mesh>
      ))}

      {/* walls */}
      <mesh position={[ROOM.minX - 0.1, H / 2, CZ]} material={m.plaster}>
        <boxGeometry args={[0.2, H, D]} />
      </mesh>
      <mesh position={[ROOM.maxX + 0.1, H / 2, CZ]} material={m.plaster}>
        <boxGeometry args={[0.2, H, D]} />
      </mesh>
      <mesh position={[0, H / 2, ROOM.minZ - 0.1]} material={m.plaster}>
        <boxGeometry args={[W, H, 0.2]} />
      </mesh>
      {/* dark wainscot */}
      <mesh position={[ROOM.minX + 0.03, 0.5, CZ]} material={m.darkWood}>
        <boxGeometry args={[0.06, 1.0, D]} />
      </mesh>
      <mesh position={[ROOM.maxX - 0.03, 0.5, CZ]} material={m.darkWood}>
        <boxGeometry args={[0.06, 1.0, D]} />
      </mesh>
      <mesh position={[0, 0.5, ROOM.minZ + 0.03]} material={m.darkWood}>
        <boxGeometry args={[W, 1.0, 0.06]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR.halfWidth + 0.2 + (W / 2 - DOOR.halfWidth - 0.2) / 2), 0.5, ROOM.maxZ - 0.43]} material={m.darkWood}>
          <boxGeometry args={[W / 2 - DOOR.halfWidth - 0.2, 1.0, 0.06]} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.2, H / 2, D / 2]} position={[ROOM.minX - 0.2, H / 2, CZ]} />
        <CuboidCollider args={[0.2, H / 2, D / 2]} position={[ROOM.maxX + 0.2, H / 2, CZ]} />
        <CuboidCollider args={[W / 2, H / 2, 0.2]} position={[0, H / 2, ROOM.minZ - 0.2]} />
      </RigidBody>

      {/* left wall: windows and mirrors alternate */}
      {[-2.6, -8.6, -14.6].map((z) => (
        <TallWindow key={z} z={z} />
      ))}
      {[-5.6, -11.6].map((z) => (
        <Mirror key={z} x={ROOM.minX + 0.04} z={z} facing={1} width={1.4} height={2.9} y={1.4} />
      ))}
      {/* right wall: mirrors above the banquette */}
      {[-3.0, -6.6, -10.2, -13.2].map((z) => (
        <Mirror key={z} x={ROOM.maxX - 0.04} z={z} facing={-1} width={1.6} height={2.4} y={1.85} />
      ))}
      {[-4.8, -8.4, -11.7].map((z) => (
        <Sconce key={`r${z}`} x={ROOM.maxX - 0.05} z={z} facing={-1} />
      ))}
      {[-4.1, -7.1, -10.1, -13.1].map((z) => (
        <Sconce key={`l${z}`} x={ROOM.minX + 0.05} z={z} facing={1} />
      ))}

      <Banquette />

      {/* kitchen door, back right */}
      <group position={[6.2, 0, ROOM.minZ + 0.02]}>
        <mesh position={[0, 1.25, 0]} material={m.darkWood}>
          <boxGeometry args={[1.3, 2.5, 0.06]} />
        </mesh>
        <mesh position={[0, 1.7, 0.04]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#20160c" emissive="#ffcf8a" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 1.7, 0.045]} material={m.brass}>
          <torusGeometry args={[0.18, 0.025, 6, 24]} />
        </mesh>
      </group>

      <Chandelier position={[0, 4.4, -4.2]} />
      <Chandelier position={[0, 4.4, -9.4]} />
      <Chandelier position={[-0.0, 4.6, -14.0]} />
    </group>
  );
}
