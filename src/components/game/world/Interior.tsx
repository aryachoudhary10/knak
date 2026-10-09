"use client";

import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { windowGlass } from "@/game/glass";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMats } from "@/game/materials";
import { usePainting } from "@/game/paintings";
import { luxuryMats } from "@/game/luxury";
import { backWallGeometry, sideWallGeometry } from "@/game/wall";
import { curtainGeo } from "@/game/geometry";
import { BAR_ARCH, DOOR, archSpans, RIGHT_WINDOWS, ROOM, WINDOWS, type WindowSet } from "@/game/layout";
import Chandelier from "./Chandelier";
import Ceiling from "./Ceiling";

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

const WALL_SIZES = { computer: 960, phone: 500 };

type Art = { id: string; title: string; artist: string; /** height ÷ width of the canvas */ aspect: number };

/** World-famous paintings in the arches of the left wall, fetched at build time (scripts/fetch-paintings.mjs). */
const ARCH_ART: Record<number, Art> = {
  [-5.6]: { id: "cafe-terrace", title: "Café Terrace at Night", artist: "Vincent van Gogh, 1888", aspect: 1.247 },
  [-11.6]: { id: "the-kiss", title: "The Kiss", artist: "Gustav Klimt, 1908", aspect: 1.003 },
};

function Mirror({ side, z, width, height, y }: { side: "left" | "right"; z: number; width: number; height: number; y: number }) {
  const m = useMats();
  const art = side === "left" ? ARCH_ART[z] : undefined;
  const tex = usePainting(art?.id, WALL_SIZES);
  // With a painting, the arch is lined in dark velvet and the canvas hangs in its own frame, lit from above.
  const lining = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b1517", roughness: 0.95 }), []);
  const fill = tex ? lining : m.mirror;
  const pw = width - 0.28;
  const ph = art ? Math.min(height - 0.5, pw * art.aspect) : 0;
  const cy = height * 0.46;
  return (
    <OnWall side={side} z={z} y={y}>
      <mesh position={[0, height / 2, 0.02]} material={m.gilt}>
        <boxGeometry args={[width + 0.22, height + 0.18, 0.06]} />
      </mesh>
      <mesh position={[0, height, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
        <cylinderGeometry args={[width / 2 + 0.11, width / 2 + 0.11, 0.06, 40, 1, false, Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh position={[0, height / 2, 0.055]} material={fill}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, height, 0.055]} material={fill}>
        <circleGeometry args={[width / 2, 32, 0, Math.PI]} />
      </mesh>
      {tex && art && (
        <group position={[0, cy, 0.06]}>
          {/* gilt frame, a dark sight edge, then the canvas */}
          <mesh position={[0, 0, 0.04]} material={m.gilt}>
            <boxGeometry args={[pw + 0.16, ph + 0.16, 0.08]} />
          </mesh>
          <mesh position={[0, 0, 0.081]}>
            <planeGeometry args={[pw + 0.03, ph + 0.03]} />
            <meshStandardMaterial color="#1a1210" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.083]}>
            <planeGeometry args={[pw, ph]} />
            <meshStandardMaterial map={tex} roughness={0.75} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.16} />
          </mesh>
          {/* brass picture light */}
          <mesh position={[0, ph / 2 + 0.16, 0.2]} rotation={[0, 0, Math.PI / 2]} material={m.brass}>
            <cylinderGeometry args={[0.035, 0.035, pw * 0.6, 16]} />
          </mesh>
          <mesh position={[0, ph / 2 + 0.12, 0.1]} material={m.brass}>
            <boxGeometry args={[0.03, 0.1, 0.2]} />
          </mesh>
          <mesh position={[0, ph / 2 + 0.135, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pw * 0.56, 0.03]} />
            <meshBasicMaterial color="#ffe6b8" toneMapped={false} />
          </mesh>
          {/* the name plate */}
          <mesh position={[0, -ph / 2 - 0.17, 0.02]} material={m.brass}>
            <boxGeometry args={[0.3, 0.07, 0.01]} />
          </mesh>
        </group>
      )}
      {/* carved crest */}
      <mesh position={[0, height + width / 2 + 0.16, 0.04]} material={m.gilt} scale={[1.6, 1, 0.5]}>
        <sphereGeometry args={[0.1, 16, 10]} />
      </mesh>
    </OnWall>
  );
}

/** The way through to the bar salon: a gilt-moulded arch with velvet portières tied back, and a brass plaque. */
function BarArch({ x }: { x: number }) {
  const m = useMats();
  const { halfWidth: w, spring } = BAR_ARCH;
  return (
    <group position={[x, 0, ROOM.minZ + 0.02]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w + 0.06), spring / 2, 0.02]} material={m.gilt}>
          <boxGeometry args={[0.1, spring, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, spring, 0.02]} material={m.gilt}>
        <torusGeometry args={[w + 0.06, 0.05, 8, 32, Math.PI]} />
      </mesh>
      {/* the soffit of the opening, so the arch reads as cut through a thick wall */}
      <mesh position={[0, spring, -0.2]} rotation={[Math.PI / 2, 0, 0]} material={m.plaster}>
        <cylinderGeometry args={[w, w, 0.4, 24, 1, true, -Math.PI / 2, Math.PI]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`j${s}`} position={[s * w, spring / 2, -0.2]} rotation={[0, (s * Math.PI) / 2, 0]} material={m.plaster}>
          <planeGeometry args={[0.4, spring]} />
        </mesh>
      ))}
      {/* velvet portières gathered to each side */}
      {[-1, 1].map((s) => (
        <mesh key={`c${s}`} position={[s * (w - 0.12), spring / 2 + 0.3, 0.12]} geometry={curtainGeo(0.34, spring + 0.6)} material={m.burgundy} />
      ))}
      <mesh position={[0, spring + w + 0.42, 0.04]} material={m.brass}>
        <boxGeometry args={[0.9, 0.22, 0.02]} />
      </mesh>
    </group>
  );
}

/** Clear glass with slim walnut glazing bars; through it, the real garden and street. */

function TallWindow({ side, z, win }: { side: "left" | "right"; z: number; win: WindowSet }) {
  const m = useMats();
  const w = win.halfWidth * 2;
  const h = win.spring - win.sill;
  return (
    <OnWall side={side} z={z} y={win.sill}>
      <mesh position={[0, h / 2, 0]} material={windowGlass}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, h, 0]} material={windowGlass}>
        <circleGeometry args={[w / 2, 24, 0, Math.PI]} />
      </mesh>
      {[-w / 2, 0, w / 2].map((dx) => (
        <mesh key={dx} position={[dx, h / 2, 0.03]} material={m.darkWood}>
          <boxGeometry args={[dx === 0 ? 0.045 : 0.07, h, 0.06]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, (i * h) / 4, 0.03]} material={m.darkWood}>
          <boxGeometry args={[w, i === 0 || i === 4 ? 0.06 : 0.04, 0.06]} />
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
          <mesh position={[0, 0.11, 0]} material={m.sconceShade}>
            <cylinderGeometry args={[0.04, 0.07, 0.09, 16, 1, true]} />
          </mesh>
        </group>
      ))}
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

const BORDER = 0.6;
const RUNNER = { w: 1.6, z0: -0.45, z1: -13.7 } as const;
/** The rug the runner opens into at the counter, spanning its whole front. */
const COUNTER_RUG = { w: 6.8, z0: -13.6, z1: -15.1 } as const;

/**
 * Cabochon marble edged in brass inside a Nero Marquina border, with a burgundy runner from the door that opens into
 * a medallion rug along the counter. Satin, not mirror-polished: a live reflection would cost a second render of the
 * room every frame.
 */
function Floor() {
  const m = useMats();
  const lux = luxuryMats();
  const fieldW = W - BORDER * 2;
  const fieldD = D - 0.4 - BORDER * 2;
  const fieldZ = (ROOM.minZ + ROOM.maxZ - 0.4) / 2;
  const runLen = RUNNER.z0 - RUNNER.z1;
  const { field, border, runner } = useMemo(
    () => ({ field: lux.cabochon(fieldW / 1.0, fieldD / 1.0), border: lux.nero(W, D), runner: lux.runner(runLen) }),
    [lux, fieldW, fieldD, runLen],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, CZ]} receiveShadow material={border}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, fieldZ]} receiveShadow material={field}>
        <planeGeometry args={[fieldW, fieldD]} />
      </mesh>
      {/* brass fillet between field and border */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * (fieldW / 2 + 0.02), 0.0065, fieldZ]} material={m.brass}>
            <planeGeometry args={[0.035, fieldD + 0.08]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0065, fieldZ + s * (fieldD / 2 + 0.02)]} material={m.brass}>
            <planeGeometry args={[fieldW + 0.08, 0.035]} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, (RUNNER.z0 + RUNNER.z1) / 2]} receiveShadow material={runner}>
        <planeGeometry args={[RUNNER.w, runLen]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, (COUNTER_RUG.z0 + COUNTER_RUG.z1) / 2]} receiveShadow material={lux.counterRug}>
        <planeGeometry args={[COUNTER_RUG.w, COUNTER_RUG.z0 - COUNTER_RUG.z1]} />
      </mesh>
    </group>
  );
}

/** Olive trees in black lacquer planters, as in the grand cafés' corners. One shared foliage mesh per tree. */
let oliveFoliage: THREE.BufferGeometry | null = null;
function foliageGeo() {
  if (oliveFoliage) return oliveFoliage;
  const parts: THREE.BufferGeometry[] = [];
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 22; i++) {
    const g = new THREE.IcosahedronGeometry(0.16 + rnd() * 0.14, 0);
    const a = rnd() * Math.PI * 2;
    const r = 0.1 + rnd() * 0.45;
    g.scale(1, 0.75, 1);
    g.translate(Math.cos(a) * r, 1.55 + rnd() * 0.75, Math.sin(a) * r);
    parts.push(g.toNonIndexed());
  }
  oliveFoliage = mergeGeometries(parts);
  oliveFoliage.computeVertexNormals();
  return oliveFoliage;
}

const oliveLeaf = new THREE.MeshStandardMaterial({ color: "#59613f", roughness: 0.85, flatShading: true });
const lacquer = new THREE.MeshStandardMaterial({ color: "#121110", roughness: 0.25, metalness: 0.1 });

function OliveTree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.3, 0]} material={lacquer} castShadow>
        <cylinderGeometry args={[0.3, 0.24, 0.6, 24]} />
      </mesh>
      <mesh position={[0, 0.605, 0]} material={m.brass}>
        <cylinderGeometry args={[0.305, 0.305, 0.015, 24]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, 0.08]} material={m.darkWood}>
        <cylinderGeometry args={[0.025, 0.045, 1.0, 6]} />
      </mesh>
      <mesh geometry={foliageGeo()} material={oliveLeaf} castShadow />
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.5, 0.34]} position={[0, 0.5, 0]} />
      </RigidBody>
    </group>
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
      <Ceiling />
      {/* plaster roses above the chandeliers */}
      {[-4.2, -9.2, -14.2].map((z) => (
        <group key={z} position={[0, H - 0.01, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.panel}>
            <ringGeometry args={[0.3, 0.75, 40]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={m.gilt}>
            <torusGeometry args={[0.55, 0.03, 8, 48]} />
          </mesh>
        </group>
      ))}

      {/* walls */}
      <mesh geometry={sideWallGeometry("left")} material={m.plaster} />
      <mesh geometry={sideWallGeometry("right")} material={m.plaster} />
      <mesh geometry={backWallGeometry(H)} material={m.plaster} />
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
      {/* back wainscot, broken by the arch to the bar */}
      {archSpans(ROOM.minX, ROOM.maxX, 0.25).map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, 0.5, ROOM.minZ + 0.03]} material={m.darkWood}>
          <boxGeometry args={[b - a, 1.0, 0.06]} />
        </mesh>
      ))}
      {BAR_ARCH.xs.map((x) => (
        <BarArch key={x} x={x} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR.halfWidth + 0.2 + (W / 2 - DOOR.halfWidth - 0.2) / 2), 0.5, ROOM.maxZ - 0.43]} material={m.darkWood}>
          <boxGeometry args={[W / 2 - DOOR.halfWidth - 0.2, 1.0, 0.06]} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.2, H / 2, D / 2]} position={[ROOM.minX - 0.2, H / 2, CZ]} />
        <CuboidCollider args={[0.2, H / 2, D / 2]} position={[ROOM.maxX + 0.2, H / 2, CZ]} />
        {/* back wall either side of the arch, and above it */}
        {archSpans(ROOM.minX, ROOM.maxX).map(([a, b]) => (
          <CuboidCollider key={a} args={[(b - a) / 2, H / 2, 0.2]} position={[(a + b) / 2, H / 2, ROOM.minZ - 0.2]} />
        ))}
        {BAR_ARCH.xs.map((x) => (
          <CuboidCollider key={`top${x}`} args={[BAR_ARCH.halfWidth, (H - BAR_ARCH.spring - BAR_ARCH.halfWidth) / 2, 0.2]} position={[x, (H + BAR_ARCH.spring + BAR_ARCH.halfWidth) / 2, ROOM.minZ - 0.2]} />
        ))}
      </RigidBody>

      {sideWallFeatures.left.map((z) => (
        <Pilaster key={`pl${z}`} side="left" z={z} />
      ))}
      {sideWallFeatures.right.map((z) => (
        <Pilaster key={`pr${z}`} side="right" z={z} />
      ))}
      {WINDOWS.z.map((z) => (
        <TallWindow key={z} side="left" z={z} win={WINDOWS} />
      ))}
      {[-5.6, -11.6].map((z) => (
        <Mirror key={z} side="left" z={z} width={1.5} height={3.0} y={1.3} />
      ))}
      {RIGHT_WINDOWS.z.map((z) => (
        <TallWindow key={z} side="right" z={z} win={RIGHT_WINDOWS} />
      ))}
      {sideWallFeatures.left.slice(0, 4).map((z) => (
        <Sconce key={`sl${z}`} side="left" z={z} />
      ))}
      {sideWallFeatures.right.slice(1, 4).map((z) => (
        <Sconce key={`sr${z}`} side="right" z={z} />
      ))}

      <Banquette />

      {[[-7.3, -1.0], [7.3, -0.95], [-4.6, -15.3], [4.6, -15.3], [-7.3, -16.8], [7.3, -16.8]].map(([x, z]) => (
        <OliveTree key={`${x}${z}`} x={x} z={z} s={x * x > 30 ? 1.1 : 0.9} />
      ))}

      <Chandelier position={[0, 4.1, -4.2]} ceiling={H} />
      <Chandelier position={[0, 4.1, -9.2]} ceiling={H} />
      <Chandelier position={[0, 4.3, -14.2]} ceiling={H} />
    </group>
  );
}
