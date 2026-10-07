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
      {/* acanthus band and corner volutes */}
      <mesh position={[0, 6.2, 0.26]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.5, 1]} material={m.stone}>
        <cylinderGeometry args={[0.36, 0.3, 0.22, 12]} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.38, 6.42, 0.38]} rotation={[0, Math.PI / 2, 0]} material={m.stone}>
          <torusGeometry args={[0.08, 0.03, 6, 14]} />
        </mesh>
      ))}
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
      <mesh position={[0, y0 + h / 2, 0]} material={m.glassDim}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, y0 + h, 0]} material={m.glassDim}>
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

/** Painted joinery for the doors and fanlight: warm ivory gloss, like the reference entrance. */
const doorPaint = new THREE.MeshStandardMaterial({ color: "#f3ecdd", roughness: 0.45 });
/** Clear glass: what glows through it is the real lit dining room, not a painted light. */
const entryGlass = new THREE.MeshPhysicalMaterial({ color: "#e9dcc0", transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false });

/** A carriage lantern on a swan-neck bracket: black iron, four glass sides, a candle-warm bulb. */
function Lantern({ x, y }: { x: number; y: number }) {
  const m = useMats();
  return (
    <group position={[x, y, 0.3]}>
      {/* wall plate and swan neck */}
      <mesh position={[0, 0.55, -0.04]} material={m.blackIron}>
        <boxGeometry args={[0.12, 0.34, 0.03]} />
      </mesh>
      <mesh position={[0, 0.62, 0.1]} rotation={[0, Math.PI / 2, 0]} material={m.blackIron}>
        <torusGeometry args={[0.13, 0.018, 6, 16, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.5, 0.23]} material={m.blackIron}>
        <cylinderGeometry args={[0.014, 0.014, 0.24, 6]} />
      </mesh>
      <group position={[0, 0.12, 0.23]}>
        {/* roof, finial and drip */}
        <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 4, 0]} material={m.blackIron}>
          <coneGeometry args={[0.19, 0.16, 4]} />
        </mesh>
        <mesh position={[0, 0.36, 0]} material={m.blackIron}>
          <sphereGeometry args={[0.03, 8, 6]} />
        </mesh>
        <mesh position={[0, 0.17, 0]} material={m.blackIron}>
          <boxGeometry args={[0.26, 0.03, 0.26]} />
        </mesh>
        {/* tapering glass body with iron corner bars */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]} material={entryGlass}>
          <cylinderGeometry args={[0.15, 0.11, 0.32, 4, 1, true]} />
        </mesh>
        {[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2;
          return (
            <mesh key={k} position={[Math.cos(a) * 0.092, 0, Math.sin(a) * 0.092]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} material={m.blackIron}>
              <boxGeometry args={[0.018, 0.33, 0.018]} />
            </mesh>
          );
        })}
        <mesh position={[0, -0.17, 0]} material={m.blackIron}>
          <boxGeometry args={[0.18, 0.03, 0.18]} />
        </mesh>
        <mesh position={[0, -0.24, 0]} material={m.blackIron}>
          <coneGeometry args={[0.05, 0.12, 4]} />
        </mesh>
        {/* candle bulb */}
        <mesh position={[0, -0.02, 0]} material={m.flame}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}

/** Clipped box egg in a tall ivory urn, one either side of the doors. */
function Topiary({ x }: { x: number }) {
  const m = useMats();
  return (
    <group position={[x, 0, 0.7]}>
      <mesh position={[0, 0.09, 0]} material={m.stoneShade}>
        <boxGeometry args={[0.62, 0.18, 0.62]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={m.stone}>
        <cylinderGeometry args={[0.17, 0.24, 0.26, 24]} />
      </mesh>
      {/* fluted bowl */}
      <mesh position={[0, 0.72, 0]} material={m.stone}>
        <cylinderGeometry args={[0.44, 0.2, 0.6, 24]} />
      </mesh>
      <mesh position={[0, 1.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneShade}>
        <torusGeometry args={[0.44, 0.05, 8, 32]} />
      </mesh>
      <mesh position={[0, 0.47, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.stoneShade}>
        <torusGeometry args={[0.22, 0.035, 8, 24]} />
      </mesh>
      <mesh position={[0, 1.08, 0]} material={m.darkWood}>
        <cylinderGeometry args={[0.41, 0.41, 0.02, 24]} />
      </mesh>
      <mesh position={[0, 1.62, 0]} scale={[1, 1.4, 1]} material={m.leaf}>
        <icosahedronGeometry args={[0.42, 3]} />
      </mesh>
    </group>
  );
}

/**
 * One leaf of the entrance doors, as in the reference: painted ivory, a raised panel below, six panes of clear
 * glass above, a long brass lever. The doors swing in as a guest approaches.
 */
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
  const lw = w - 0.03; // leaf width, leaving a meeting gap
  const stile = 0.12;
  const rail = 0.14;
  const lowTop = 1.05; // top of the lower panel's rail
  const gTop = h - rail;
  const gH = gTop - lowTop;
  const gW = lw - stile * 2;
  return (
    <group ref={ref} position={[side * w, 0, -0.12]}>
      <group position={[(dir * lw) / 2, 0, 0]}>
        {/* stiles and rails */}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[(k * (lw - stile)) / 2, h / 2, 0]} material={doorPaint}>
            <boxGeometry args={[stile, h, 0.07]} />
          </mesh>
        ))}
        {[rail / 2 + 0.06, lowTop - 0.07, h - rail / 2].map((y, k) => (
          <mesh key={k} position={[0, y, 0]} material={doorPaint}>
            <boxGeometry args={[lw, k === 0 ? rail + 0.12 : rail, 0.07]} />
          </mesh>
        ))}
        {/* raised lower panel with a fine moulding */}
        <mesh position={[0, (0.18 + lowTop - 0.14) / 2, 0.005]} material={doorPaint}>
          <boxGeometry args={[gW, lowTop - 0.32, 0.05]} />
        </mesh>
        <mesh position={[0, (0.18 + lowTop - 0.14) / 2, 0.035]} material={doorPaint}>
          <boxGeometry args={[gW - 0.16, lowTop - 0.48, 0.03]} />
        </mesh>
        {/* glass, then two columns by three rows of glazing bars */}
        <mesh position={[0, lowTop + gH / 2, 0]} material={entryGlass}>
          <planeGeometry args={[gW, gH]} />
        </mesh>
        <mesh position={[0, lowTop + gH / 2, 0.01]} material={doorPaint}>
          <boxGeometry args={[0.04, gH, 0.045]} />
        </mesh>
        {[1, 2].map((r) => (
          <mesh key={r} position={[0, lowTop + (r * gH) / 3, 0.01]} material={doorPaint}>
            <boxGeometry args={[gW, 0.04, 0.045]} />
          </mesh>
        ))}
        {/* brass lever handle on the meeting stile, and two hinges */}
        <group position={[dir * (lw / 2 - stile / 2), 1.05, 0.05]}>
          <mesh position={[0, 0.05, 0]} material={m.brass}>
            <boxGeometry args={[0.045, 0.34, 0.015]} />
          </mesh>
          <mesh position={[-dir * 0.035, 0.12, 0.035]} rotation={[0, 0, Math.PI / 2]} material={m.brass}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          </mesh>
        </group>
        {[0.4, h - 0.45].map((y) => (
          <mesh key={y} position={[-dir * (lw / 2 + 0.005), y, 0.03]} material={m.brass}>
            <boxGeometry args={[0.02, 0.14, 0.03]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The stone above the doors, with the fanlight's half-round cut clean through it. */
function archHeadGeometry() {
  const w = DOOR.halfWidth;
  const shape = new THREE.Shape();
  shape.moveTo(-w, DOOR.height);
  shape.lineTo(-w, H);
  shape.lineTo(w, H);
  shape.lineTo(w, DOOR.height);
  shape.lineTo(-w, DOOR.height);
  const hole = new THREE.Path();
  hole.moveTo(-w + 0.001, FAN_Y);
  hole.absarc(0, FAN_Y, w - 0.001, Math.PI, 0, true);
  hole.lineTo(-w + 0.001, FAN_Y);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -T);
  g.computeVertexNormals();
  return g;
}

/** Spring line of the fanlight: just above the transom bar that tops the doors. */
const FAN_Y = DOOR.height + 0.12;

/**
 * The doorway as in the reference photo: moulded jambs, a transom bar, a half-round fanlight with a sunburst of
 * glazing bars, a stepped archivolt, a carved keystone, and quiet recessed panels in the spandrels.
 */
function Doorway() {
  const m = useMats();
  const w = DOOR.halfWidth;
  const head = useMemo(() => archHeadGeometry(), []);
  return (
    <group>
      <mesh geometry={head} material={m.stone} />
      {/* transom bar between the doors and the fanlight */}
      <mesh position={[0, DOOR.height + 0.06, -0.12]} material={doorPaint}>
        <boxGeometry args={[w * 2, 0.12, 0.12]} />
      </mesh>
      {/* fanlight: clear glass, an inner half-ring and radiating bars */}
      <group position={[0, FAN_Y, -0.14]}>
        <mesh material={entryGlass}>
          <circleGeometry args={[w, 48, 0, Math.PI]} />
        </mesh>
        <mesh position={[0, 0, 0.02]} material={doorPaint}>
          <torusGeometry args={[w * 0.46, 0.028, 6, 32, Math.PI]} />
        </mesh>
        {[0.5, 0.2, 0.8].map((f) => {
          const a = f * Math.PI;
          const r0 = f === 0.5 ? 0 : w * 0.46;
          const len = w - r0;
          return (
            <mesh key={f} position={[Math.cos(a) * (r0 + len / 2), Math.sin(a) * (r0 + len / 2), 0.02]} rotation={[0, 0, a]} material={doorPaint}>
              <boxGeometry args={[len, 0.035, 0.035]} />
            </mesh>
          );
        })}
        <mesh position={[0, 0, 0.02]} material={doorPaint}>
          <torusGeometry args={[w - 0.03, 0.045, 6, 48, Math.PI]} />
        </mesh>
      </group>
      {/* jambs: two stepped bands framing the opening, with plinth blocks */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (w + 0.1), FAN_Y / 2, 0.04]} material={m.stone}>
            <boxGeometry args={[0.2, FAN_Y, 0.1]} />
          </mesh>
          <mesh position={[s * (w + 0.27), FAN_Y / 2, 0.02]} material={m.stoneShade}>
            <boxGeometry args={[0.14, FAN_Y, 0.06]} />
          </mesh>
          <mesh position={[s * (w + 0.18), 0.22, 0.07]} material={m.stoneShade}>
            <boxGeometry args={[0.42, 0.44, 0.16]} />
          </mesh>
          {/* impost moulding at the spring of the arch */}
          <mesh position={[s * (w + 0.2), FAN_Y - 0.05, 0.08]} material={m.stone}>
            <boxGeometry args={[0.5, 0.12, 0.18]} />
          </mesh>
        </group>
      ))}
      {/* archivolt: three concentric mouldings stepping out from the glass */}
      {[
        [w + 0.08, 0.07, 0.05],
        [w + 0.22, 0.06, 0.09],
        [w + 0.34, 0.045, 0.06],
      ].map(([r, t, z], k) => (
        <mesh key={k} position={[0, FAN_Y, z]} material={k === 1 ? m.stone : m.stoneShade}>
          <torusGeometry args={[r, t, 8, 48, Math.PI]} />
        </mesh>
      ))}
      {/* keystone: a carved console */}
      <group position={[0, FAN_Y + w + 0.12, 0.12]}>
        <mesh material={m.stone}>
          <boxGeometry args={[0.34, 0.5, 0.2]} />
        </mesh>
        <mesh position={[0, 0.3, 0.02]} material={m.stoneShade}>
          <boxGeometry args={[0.46, 0.1, 0.24]} />
        </mesh>
        <mesh position={[0, 0.02, 0.11]} scale={[1, 1.3, 0.5]} material={m.stone}>
          <sphereGeometry args={[0.1, 12, 8]} />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 0.12, -0.16, 0.1]} rotation={[0, Math.PI / 2, 0]} material={m.stone}>
            <torusGeometry args={[0.05, 0.02, 6, 12]} />
          </mesh>
        ))}
      </group>
      {/* a broad panel above, under the frieze */}
      <PanelMould x={0} y={5.75} w={3.2} h={0.6} />
    </group>
  );
}

/** A rectangle of fine raised moulding on the stone: the quiet panelling of the reference facade. */
function PanelMould({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const m = useMats();
  const t = 0.035;
  return (
    <group position={[x, y, 0.02]}>
      {[-1, 1].map((k) => (
        <mesh key={`h${k}`} position={[0, (k * h) / 2, 0]} material={m.stoneShade}>
          <boxGeometry args={[w + t, t, 0.03]} />
        </mesh>
      ))}
      {[-1, 1].map((k) => (
        <mesh key={`v${k}`} position={[(k * w) / 2, 0, 0]} material={m.stoneShade}>
          <boxGeometry args={[t, h, 0.03]} />
        </mesh>
      ))}
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
      <Doorway />
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
        <meshStandardMaterial map={sign} transparent metalness={0.7} roughness={0.3} emissive="#6b4a12" emissiveMap={sign} emissiveIntensity={0.18} />
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

      <Lantern x={-2.35} y={3.1} />
      <Lantern x={2.35} y={3.1} />
      <Topiary x={-2.15} />
      <Topiary x={2.15} />
    </group>
  );
}
