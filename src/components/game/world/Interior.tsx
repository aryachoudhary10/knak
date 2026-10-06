"use client";

import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { isHighQuality } from "@/game/quality";
import { useMats } from "@/game/materials";
import { checkerTexture, windowViewTexture } from "@/game/textures";
import { curtainGeo } from "@/game/geometry";
import { DOOR, ROOM } from "@/game/layout";
import Chandelier from "./Chandelier";

const W = ROOM.maxX - ROOM.minX;
const D = ROOM.maxZ - ROOM.minZ;
const CZ = (ROOM.maxZ + ROOM.minZ) / 2;
const H = ROOM.height;

/** Rectangular gilt moulding frame, drawn in the wall plane (local x/y), facing +z. */
function Frame({ w, h, t = 0.035, material }: { w: number; h: number; t?: number; material: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={material}>
        <boxGeometry args={[w, t, t]} />
      </mesh>
      <mesh position={[0, -h / 2, 0]} material={material}>
        <boxGeometry args={[w, t, t]} />
      </mesh>
      <mesh position={[w / 2, 0, 0]} material={material}>
        <boxGeometry args={[t, h, t]} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]} material={material}>
        <boxGeometry args={[t, h, t]} />
      </mesh>
    </group>
  );
}

/** Puts children on a side wall: local +z faces into the room. */
function OnWall({ side, z, y, children }: { side: "left" | "right"; z: number; y: number; children: React.ReactNode }) {
  const x = side === "left" ? ROOM.minX + 0.02 : ROOM.maxX - 0.02;
  return (
    <group position={[x, y, z]} rotation={[0, side === "left" ? Math.PI / 2 : -Math.PI / 2, 0]}>
      {children}
    </group>
  );
}

function Pilaster({ side, z }: { side: "left" | "right"; z: number }) {
  const m = useMats();
  return (
    <OnWall side={side} z={z} y={0}>
      <mesh position={[0, H / 2, 0.06]} material={m.panel}>
        <boxGeometry args={[0.5, H, 0.12]} />
      </mesh>
      <group position={[0, 3.2, 0.125]}>
        <Frame w={0.32} h={3.4} t={0.025} material={m.gilt} />
      </group>
      <mesh position={[0, 5.3, 0.1]} material={m.gilt}>
        <boxGeometry args={[0.62, 0.22, 0.18]} />
      </mesh>
      <mesh position={[0, 5.14, 0.1]} material={m.gilt}>
        <boxGeometry args={[0.54, 0.06, 0.16]} />
      </mesh>
    </OnWall>
  );
}

function Mirror({ side, z, width, height, y }: { side: "left" | "right"; z: number; width: number; height: number; y: number }) {
  const m = useMats();
  return (
    <OnWall side={side} z={z} y={y}>
      <mesh position={[0, height / 2, 0.02]} material={m.gilt}>
        <boxGeometry args={[width + 0.22, height + 0.18, 0.06]} />
      </mesh>
      <mesh position={[0, height, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
        <cylinderGeometry args={[width / 2 + 0.11, width / 2 + 0.11, 0.06, 40, 1, false, Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh position={[0, height / 2, 0.055]} material={m.mirror}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, height, 0.055]} material={m.mirror}>
        <circleGeometry args={[width / 2, 32, 0, Math.PI]} />
      </mesh>
      {/* carved crest */}
      <mesh position={[0, height + width / 2 + 0.16, 0.04]} material={m.gilt} scale={[1.6, 1, 0.5]}>
        <sphereGeometry args={[0.1, 16, 10]} />
      </mesh>
    </OnWall>
  );
}

function TallWindow({ z }: { z: number }) {
  const m = useMats();
  const view = useMemo(() => windowViewTexture(), []);
  const w = 1.6;
  const h = 3.6;
  return (
    <OnWall side="left" z={z} y={1.1}>
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
      {/* draped curtains with a gilt pole */}
      <mesh position={[0, h + 1.15, 0.2]} rotation={[0, 0, Math.PI / 2]} material={m.gilt}>
        <cylinderGeometry args={[0.025, 0.025, w + 1.4, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + 0.3), (h + 1.1) / 2 - 0.05, 0.2]} geometry={curtainGeo(0.62, h + 1.2)} material={m.curtain} />
      ))}
      {/* sill */}
      <mesh position={[0, -0.04, 0.1]} material={m.marble}>
        <boxGeometry args={[w + 0.3, 0.06, 0.24]} />
      </mesh>
    </OnWall>
  );
}

function Sconce({ side, z }: { side: "left" | "right"; z: number }) {
  const m = useMats();
  const hq = isHighQuality();
  return (
    <OnWall side={side} z={z} y={2.45}>
      <mesh position={[0, 0, 0.14]} material={m.gilt}>
        <boxGeometry args={[0.1, 0.32, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.15, 0.1, 0.26]}>
          <mesh position={[-s * 0.07, -0.05, -0.05]} rotation={[0, 0, s * 0.9]} material={m.gilt}>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
          </mesh>
          <mesh material={m.porcelain}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 8]} />
          </mesh>
          <mesh position={[0, 0.07, 0]} material={m.bulb} scale={[1, 1.5, 1]}>
            <sphereGeometry args={[0.016, 8, 8]} />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.04, 0.07, 0.09, 16, 1, true]} />
            <meshStandardMaterial color="#f5e2bd" emissive="#ffcf8a" emissiveIntensity={1.6} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {hq && <pointLight position={[0, 0.25, 0.45]} color="#ffc27e" intensity={2.2} distance={4} decay={2} />}
    </OnWall>
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
      <mesh position={[7.45, 0.21, cz]} material={m.darkWood}>
        <boxGeometry args={[0.95, 0.42, len]} />
      </mesh>
      <mesh position={[7.38, 0.48, cz]} material={m.burgundy} castShadow>
        <boxGeometry args={[0.92, 0.14, len]} />
      </mesh>
      <mesh position={[7.84, 1.08, cz]} rotation={[0, -Math.PI / 2, 0.0]} material={m.tufted}>
        <boxGeometry args={[len, 1.0, 0.26]} />
      </mesh>
      <mesh position={[7.9, 1.62, cz]} material={m.darkWood}>
        <boxGeometry args={[0.24, 0.08, len]} />
      </mesh>
      <mesh position={[7.6, 0.03, cz]} material={m.brass}>
        <boxGeometry args={[0.02, 0.06, len]} />
      </mesh>
    </group>
  );
}

function Floor() {
  const m = useMats();
  const map = useMemo(() => {
    const t = checkerTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(W / 1.6, D / 1.6);
    return t;
  }, []);
  if (!m.hq) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, CZ]} receiveShadow material={m.checker}>
        <planeGeometry args={[W, D]} />
      </mesh>
    );
  }
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, CZ]} receiveShadow>
      <planeGeometry args={[W, D]} />
      <MeshReflectorMaterial
        map={map}
        normalMap={m.floorNormal}
        normalScale={new THREE.Vector2(0.15, 0.15)}
        blur={[300, 80]}
        resolution={1024}
        mixBlur={1}
        mixStrength={0.7}
        mixContrast={1}
        roughness={0.5}
        depthScale={0.4}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.2}
        metalness={0}
        mirror={0}
      />
    </mesh>
  );
}

export default function Interior() {
  const m = useMats();
  const sideWallFeatures = {
    left: [-4.1, -7.1, -10.1, -13.1, -16.6],
    right: [-1.5, -4.8, -8.4, -11.7, -15.2],
  } as const;
  return (
    <group>
      <Floor />
      {/* ceiling: coffers, cornice and roses */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, CZ]} material={m.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {[ROOM.minX + 0.2, ROOM.maxX - 0.2].map((x) => (
        <group key={x}>
          <mesh position={[x, H - 0.18, CZ]} material={m.gilt}>
            <boxGeometry args={[0.4, 0.36, D]} />
          </mesh>
          <mesh position={[x + (x < 0 ? 0.25 : -0.25), H - 0.32, CZ]} material={m.panel}>
            <boxGeometry args={[0.12, 0.1, D]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H - 0.18, ROOM.minZ + 0.2]} material={m.gilt}>
        <boxGeometry args={[W, 0.36, 0.4]} />
      </mesh>
      <mesh position={[0, H - 0.18, ROOM.maxZ - 0.6]} material={m.gilt}>
        <boxGeometry args={[W, 0.36, 0.4]} />
      </mesh>
      {[-11.8, -6.6].map((z) => (
        <mesh key={z} position={[0, H - 0.12, z]} material={m.panel}>
          <boxGeometry args={[W, 0.24, 0.35]} />
        </mesh>
      ))}
      {[-4.2, -9.2, -14.2].map((z) => (
        <group key={z} position={[0, H - 0.01, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.panel}>
            <ringGeometry args={[0.3, 0.75, 40]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={m.gilt}>
            <torusGeometry args={[0.55, 0.03, 8, 48]} />
          </mesh>
          <group position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Frame w={4.2} h={3.6} t={0.05} material={m.gilt} />
          </group>
        </group>
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
      {/* dark panelled wainscot with gilt chair rail */}
      {(["left", "right"] as const).map((side) => (
        <group key={side}>
          <OnWall side={side} z={CZ} y={0.5}>
            <mesh material={m.darkWood}>
              <boxGeometry args={[D, 1.0, 0.06]} />
            </mesh>
            <mesh position={[0, 0.52, 0.04]} material={m.gilt}>
              <boxGeometry args={[D, 0.05, 0.06]} />
            </mesh>
          </OnWall>
          <OnWall side={side} z={CZ} y={5.35}>
            <mesh material={m.gilt}>
              <boxGeometry args={[D, 0.05, 0.05]} />
            </mesh>
          </OnWall>
        </group>
      ))}
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

      {sideWallFeatures.left.map((z) => (
        <Pilaster key={`pl${z}`} side="left" z={z} />
      ))}
      {sideWallFeatures.right.map((z) => (
        <Pilaster key={`pr${z}`} side="right" z={z} />
      ))}
      {[-2.6, -8.6, -14.6].map((z) => (
        <TallWindow key={z} z={z} />
      ))}
      {[-5.6, -11.6].map((z) => (
        <Mirror key={z} side="left" z={z} width={1.5} height={3.0} y={1.3} />
      ))}
      {[-3.15, -6.6, -10.05, -13.45].map((z) => (
        <Mirror key={z} side="right" z={z} width={1.9} height={2.3} y={1.8} />
      ))}
      {sideWallFeatures.left.slice(0, 4).map((z) => (
        <Sconce key={`sl${z}`} side="left" z={z} />
      ))}
      {sideWallFeatures.right.slice(1, 4).map((z) => (
        <Sconce key={`sr${z}`} side="right" z={z} />
      ))}

      <Banquette />

      {/* kitchen door, back right */}
      <group position={[6.2, 0, ROOM.minZ + 0.02]}>
        <mesh position={[0, 1.3, 0]} material={m.darkWood}>
          <boxGeometry args={[1.3, 2.6, 0.06]} />
        </mesh>
        <group position={[0, 1.3, 0.04]}>
          <Frame w={1.5} h={2.75} t={0.06} material={m.gilt} />
        </group>
        <mesh position={[0, 1.75, 0.04]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#20160c" emissive="#ffcf8a" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 1.75, 0.045]} material={m.brass}>
          <torusGeometry args={[0.18, 0.025, 6, 24]} />
        </mesh>
      </group>

      <Chandelier position={[0, 4.1, -4.2]} ceiling={H} />
      <Chandelier position={[0, 4.1, -9.2]} ceiling={H} />
      <Chandelier position={[0, 4.3, -14.2]} ceiling={H} />
    </group>
  );
}
