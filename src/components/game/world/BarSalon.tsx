"use client";

import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useMats } from "@/game/materials";
import { frescoTexture, luxuryMats } from "@/game/luxury";
import { bottlesTexture } from "@/game/textures";
import { BAR_ARCH, ISLAND, SALON, WINTER } from "@/game/layout";

const { x0: X0, x1: X1, z0: Z0, z1: Z1, stepFrom: S0, stepTo: S1, floor: F } = SALON;
/** Ceiling of the salon, measured from the street level. */
const CEIL = SALON.height;
const W = X1 - X0;
const STEP = (S0 - S1) / 3;
const DOOR0 = WINTER.doorZ + WINTER.doorHalf;
const DOOR1 = WINTER.doorZ - WINTER.doorHalf;

/** Lacquered near-black walls and ceiling: the bar is the dark, intimate room after the bright hall. */
const lacquer = new THREE.MeshPhysicalMaterial({ color: "#1d1715", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
const piano = new THREE.MeshPhysicalMaterial({ color: "#0a0a0b", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
const ivoryKeys = new THREE.MeshStandardMaterial({ color: "#f4efe4", roughness: 0.4 });
const fire = new THREE.MeshStandardMaterial({ color: "#2a0e02", emissive: "#ff8a2a", emissiveIntensity: 2.6, toneMapped: false });
const coupe = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.3, roughness: 0.05 });
const ember = new THREE.MeshStandardMaterial({ color: "#100604", emissive: "#ff5a12", emissiveIntensity: 1.2 });

function ellipseRing(rx: number, rz: number, width: number, height: number) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, rx - width, rz - width, 0, Math.PI * 2, true, 0);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 48 });
  // Shape lies in x/y; stand it up so the ring is in x/z and rises along +y.
  g.rotateX(-Math.PI / 2);
  return g;
}

function ellipseTube(rx: number, rz: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, 0, Math.sin(t) * rz));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, radius, 6, true);
}

/** The oval island bar: dark marble body, white marble top with a brass edge, a brass foot rail, and a lit bottle tower at its heart. */
function IslandBar() {
  const m = useMats();
  const lux = luxuryMats();
  const { rx, rz, height: h } = ISLAND;
  const geo = useMemo(
    () => ({
      body: ellipseRing(rx, rz, 0.62, h - 0.05),
      top: ellipseRing(rx + 0.08, rz + 0.08, 0.82, 0.05),
      edge: ellipseTube(rx + 0.08, rz + 0.08, 0.025),
      rail: ellipseTube(rx + 0.2, rz + 0.2, 0.022),
    }),
    [rx, rz, h],
  );
  const nero = useMemo(() => lux.nero(3, 2), [lux]);
  const bottles = useMemo(() => {
    const t = bottlesTexture().clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group position={[ISLAND.x, F, ISLAND.z]}>
      <mesh geometry={geo.body} material={nero} castShadow />
      <mesh geometry={geo.top} position={[0, h - 0.05, 0]} material={m.marble} />
      <mesh geometry={geo.edge} position={[0, h - 0.04, 0]} material={m.brass} />
      <mesh geometry={geo.rail} position={[0, 0.2, 0]} material={m.brass} />
      {/* bottle tower: three lit tiers ringed in brass, rising to a canopy */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 2.2, 24, 1, true]} />
        <meshStandardMaterial map={bottles} emissive="#ffffff" emissiveMap={bottles} emissiveIntensity={0.7} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {[1.1, 1.85, 2.6, 3.3].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
          <torusGeometry args={[0.57, 0.025, 6, 32]} />
        </mesh>
      ))}
      <mesh position={[0, 3.45, 0]} material={m.brass}>
        <cylinderGeometry args={[0.75, 0.6, 0.18, 32]} />
      </mesh>
      <mesh position={[0, (3.55 + CEIL - F) / 2, 0]} material={m.brass}>
        <cylinderGeometry args={[0.05, 0.05, CEIL - F - 3.55, 8]} />
      </mesh>
      {/* glasses and a couple of coupes on the bar */}
      {[-1.5, -0.4, 0.9, 1.8].map((x, i) => (
        <mesh key={x} position={[x, h + 0.08, (i % 2 ? 1 : -1) * 0.2 + rz * 0.9 * Math.sqrt(Math.max(0, 1 - (x / (rx + 0.04)) ** 2))]} material={coupe}>
          <cylinderGeometry args={[0.04, 0.03, 0.14, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function Stool({ x, z }: { x: number; z: number }) {
  const m = useMats();
  return (
    <group position={[x, F, z]}>
      <mesh position={[0, 0.02, 0]} material={m.brass}>
        <cylinderGeometry args={[0.2, 0.22, 0.04, 20]} />
      </mesh>
      <mesh position={[0, 0.39, 0]} material={m.brass}>
        <cylinderGeometry args={[0.025, 0.03, 0.74, 10]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
        <torusGeometry args={[0.16, 0.012, 6, 20]} />
      </mesh>
      <mesh position={[0, 0.79, 0]} material={m.tufted}>
        <cylinderGeometry args={[0.2, 0.18, 0.1, 24]} />
      </mesh>
    </group>
  );
}

/** A velvet banquette along the left wall with small marble cocktail tables and their lamps. */
function Lounge() {
  const m = useMats();
  const za = -23.9;
  const zb = -29.9;
  const len = za - zb;
  const mid = (za + zb) / 2;
  return (
    <group>
      <mesh position={[X0 + 0.35, F + 0.22, mid]} material={m.darkWood}>
        <boxGeometry args={[0.7, 0.44, len]} />
      </mesh>
      <mesh position={[X0 + 0.38, F + 0.49, mid]} material={m.tufted}>
        <boxGeometry args={[0.66, 0.12, len - 0.06]} />
      </mesh>
      <mesh position={[X0 + 0.1, F + 0.95, mid]} material={m.tufted}>
        <boxGeometry args={[0.18, 0.95, len - 0.06]} />
      </mesh>
      {[-25.8, -27.7].map((z) => (
        <group key={z} position={[X0 + 1.35, F, z]}>
          <mesh position={[0, 0.03, 0]} material={m.brass}>
            <cylinderGeometry args={[0.18, 0.2, 0.06, 20]} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={m.brass}>
            <cylinderGeometry args={[0.03, 0.03, 0.54, 8]} />
          </mesh>
          <mesh position={[0, 0.58, 0]} material={m.marble}>
            <cylinderGeometry args={[0.36, 0.36, 0.035, 28]} />
          </mesh>
          <mesh position={[0, 0.76, 0]} material={m.lampShade}>
            <cylinderGeometry args={[0.05, 0.085, 0.11, 12, 1, true]} />
          </mesh>
          <mesh position={[0, 0.66, 0]} material={m.brass}>
            <cylinderGeometry args={[0.008, 0.01, 0.16, 8]} />
          </mesh>
        </group>
      ))}
      {/* a deep rug, burgundy with a champagne border */}
      <mesh position={[X0 + 2.3, F + 0.006, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, len - 0.4]} />
        <meshStandardMaterial color="#c9b48a" roughness={1} />
      </mesh>
      <mesh position={[X0 + 2.3, F + 0.008, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.9, len - 0.7]} />
        <meshStandardMaterial color="#4a1218" roughness={1} />
      </mesh>
    </group>
  );
}

/** A carved marble fireplace on the back wall, with a low fire and a painting over the mantel, and two armchairs. */
function Fireplace({ x }: { x: number }) {
  const m = useMats();
  const painting = useMemo(() => new THREE.MeshStandardMaterial({ map: frescoTexture(3), roughness: 0.9 }), []);
  const z = Z1 + 0.02;
  return (
    <group position={[x, F, z]}>
      {/* surround: two jambs, a lintel and a mantel shelf */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.85, 0.6, 0.18]} material={m.marble}>
          <boxGeometry args={[0.3, 1.2, 0.36]} />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0.18]} material={m.marble}>
        <boxGeometry args={[2.0, 0.26, 0.38]} />
      </mesh>
      <mesh position={[0, 1.48, 0.22]} material={m.marble}>
        <boxGeometry args={[2.3, 0.07, 0.48]} />
      </mesh>
      <mesh position={[0, 0.6, 0.02]}>
        <boxGeometry args={[1.4, 1.2, 0.04]} />
        <meshStandardMaterial color="#0b0807" roughness={1} />
      </mesh>
      {/* logs and flames */}
      {[-0.25, 0.2].map((dx, i) => (
        <mesh key={dx} position={[dx, 0.12, 0.2]} rotation={[0, 0, Math.PI / 2 + (i ? 0.2 : -0.15)]} material={ember}>
          <cylinderGeometry args={[0.07, 0.07, 0.6, 8]} />
        </mesh>
      ))}
      {[-0.2, 0.05, 0.28].map((dx, i) => (
        <mesh key={dx} position={[dx, 0.36 + i * 0.03, 0.18]} scale={[1, 1.8, 0.5]} material={fire}>
          <coneGeometry args={[0.12, 0.3, 8]} />
        </mesh>
      ))}
      {/* painting in a gilt frame above */}
      <mesh position={[0, 2.75, 0.04]} material={m.gilt}>
        <boxGeometry args={[1.7, 1.25, 0.06]} />
      </mesh>
      <mesh position={[0, 2.75, 0.075]} material={painting}>
        <planeGeometry args={[1.5, 1.05]} />
      </mesh>
      {/* two armchairs turned toward the fire */}
      {[-1, 1].map((s) => (
        <group key={`a${s}`} position={[s * 1.15, 0, 1.9]} rotation={[0, Math.PI + s * 0.5, 0]}>
          <mesh position={[0, 0.22, 0]} material={m.darkWood}>
            <boxGeometry args={[0.78, 0.44, 0.74]} />
          </mesh>
          <mesh position={[0, 0.5, 0.02]} material={m.burgundy}>
            <boxGeometry args={[0.66, 0.14, 0.64]} />
          </mesh>
          <mesh position={[0, 0.82, -0.32]} material={m.burgundy}>
            <boxGeometry args={[0.74, 0.8, 0.14]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[k * 0.36, 0.66, 0]} material={m.burgundy}>
              <boxGeometry args={[0.1, 0.32, 0.7]} />
            </mesh>
          ))}
        </group>
      ))}
      <pointLight color="#ff9a48" intensity={3.5} distance={6} decay={2} position={[0, 0.7, 1.0]} />
    </group>
  );
}

let pianoGeo: { body: THREE.ExtrudeGeometry; lid: THREE.ExtrudeGeometry } | null = null;
function pianoGeometry() {
  if (!pianoGeo) {
    const body = new THREE.ExtrudeGeometry(grandOutline(), { depth: 0.32, bevelEnabled: false, curveSegments: 20 });
    body.rotateX(Math.PI / 2);
    const lid = new THREE.ExtrudeGeometry(grandOutline(), { depth: 0.025, bevelEnabled: false, curveSegments: 20 });
    lid.rotateX(Math.PI / 2);
    pianoGeo = { body, lid };
  }
  return pianoGeo;
}
function grandOutline() {
  // Keyboard edge along x at z = 0; the case runs out along +z, straight on the bass side, curving on the treble.
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0);
  s.lineTo(0.75, 0);
  s.lineTo(0.75, 0.7);
  s.bezierCurveTo(0.75, 1.15, 0.2, 1.2, 0.05, 1.6);
  s.bezierCurveTo(-0.05, 1.9, -0.4, 2.05, -0.62, 2.0);
  s.quadraticCurveTo(-0.75, 1.95, -0.75, 1.8);
  s.lineTo(-0.75, 0);
  return s;
}

/** A black lacquered grand piano with its lid raised, and the bench where the pianist sits. */
function GrandPiano({ x, z }: { x: number; z: number }) {
  const m = useMats();
  const { body: pianoShape, lid: lidShape } = pianoGeometry();
  return (
    // Turned so the keyboard faces the room's centre (-x) and the case runs toward the right wall.
    <group position={[x, F, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={pianoShape} position={[0, 0.98, 0.06]} material={piano} castShadow />
      {/* lid propped open along the bass side */}
      <group position={[-0.75, 0.99, 0.06]} rotation={[0, 0, 0.55]}>
        <mesh geometry={lidShape} position={[0.75, 0.0, 0]} material={piano} />
      </group>
      <mesh position={[0.35, 1.27, 0.6]} material={m.brass}>
        <cylinderGeometry args={[0.008, 0.008, 0.57, 6]} />
      </mesh>
      {/* keyboard */}
      <mesh position={[0, 0.72, -0.08]} material={piano}>
        <boxGeometry args={[1.5, 0.12, 0.3]} />
      </mesh>
      <mesh position={[0, 0.785, -0.12]} material={ivoryKeys}>
        <boxGeometry args={[1.32, 0.02, 0.16]} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (i % 7 === 2 || i % 7 === 6 ? null : (
        <mesh key={i} position={[-0.63 + i * 0.06, 0.8, -0.09]} material={piano}>
          <boxGeometry args={[0.025, 0.02, 0.09]} />
        </mesh>
      )))}
      {/* legs and lyre */}
      {[[-0.65, 0.12], [0.65, 0.12], [-0.6, 1.8]].map(([lx, lz]) => (
        <mesh key={`${lx}${lz}`} position={[lx, 0.42, lz]} material={piano}>
          <cylinderGeometry args={[0.05, 0.035, 0.84, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0.3]} material={m.brass}>
        <boxGeometry args={[0.18, 0.5, 0.03]} />
      </mesh>
      {/* bench */}
      <group position={[0, 0, -0.62]}>
        <mesh position={[0, 0.47, 0]} material={piano}>
          <boxGeometry args={[0.8, 0.07, 0.36]} />
        </mesh>
        <mesh position={[0, 0.515, 0]} material={m.tufted}>
          <boxGeometry args={[0.76, 0.04, 0.32]} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.34, 0.22, sz * 0.13]} material={piano}>
              <boxGeometry args={[0.04, 0.44, 0.04]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

/** Walls of the salon: walnut wainscot, lacquered panels with brass fillets, and warm half-moon sconces. */
function Walls() {
  const m = useMats();
  const D = Z0 - Z1;
  const mid = (Z0 + Z1) / 2;
  const fillets: { x: number; z: number; ry: number }[] = [];
  for (let z = Z0 - 1.6; z > Z1 + 0.5; z -= 1.8) {
    fillets.push({ x: X0 + 0.02, z, ry: Math.PI / 2 });
    if (z > DOOR0 + 0.2 || z < DOOR1 - 0.2) fillets.push({ x: X1 - 0.02, z, ry: -Math.PI / 2 });
  }
  for (let x = X0 + 1.5; x < X1 - 0.5; x += 1.8) fillets.push({ x, z: Z1 + 0.02, ry: 0 });
  return (
    <group>
      {/* side walls and back wall faces */}
      <mesh position={[X0 + 0.01, CEIL / 2, mid]} rotation={[0, Math.PI / 2, 0]} material={lacquer}>
        <planeGeometry args={[D, CEIL]} />
      </mesh>
      {/* right wall, opened by the French doors to the winter garden */}
      {[
        [Z0, DOOR0],
        [DOOR1, Z1],
      ].map(([a, b]) => (
        <mesh key={a} position={[X1 - 0.01, CEIL / 2, (a + b) / 2]} rotation={[0, -Math.PI / 2, 0]} material={lacquer}>
          <planeGeometry args={[a - b, CEIL]} />
        </mesh>
      ))}
      <mesh position={[X1 - 0.01, (F + WINTER.doorH + CEIL) / 2, WINTER.doorZ]} rotation={[0, -Math.PI / 2, 0]} material={lacquer}>
        <planeGeometry args={[DOOR0 - DOOR1, CEIL - F - WINTER.doorH]} />
      </mesh>
      <GardenDoors />
      <mesh position={[0, CEIL / 2, Z1 + 0.01]} material={lacquer}>
        <planeGeometry args={[W, CEIL]} />
      </mesh>
      {/* the salon side of the dining room's back wall, either side of the arch */}
      {[
        [X0, BAR_ARCH.x - BAR_ARCH.halfWidth],
        [BAR_ARCH.x + BAR_ARCH.halfWidth, X1],
      ].map(([a, b]) => (
        <mesh key={a} position={[(a + b) / 2, CEIL / 2, Z0 - 0.01]} rotation={[0, Math.PI, 0]} material={lacquer}>
          <planeGeometry args={[b - a, CEIL]} />
        </mesh>
      ))}
      <mesh position={[BAR_ARCH.x, (BAR_ARCH.spring + BAR_ARCH.halfWidth + CEIL) / 2, Z0 - 0.01]} rotation={[0, Math.PI, 0]} material={lacquer}>
        <planeGeometry args={[BAR_ARCH.halfWidth * 2, CEIL - BAR_ARCH.spring - BAR_ARCH.halfWidth]} />
      </mesh>
      {/* walnut wainscot on the raised floor */}
      {[
        { p: [X0 + 0.04, F + 0.55, (S1 + Z1) / 2] as const, a: [0.06, 1.1, S1 - Z1] as const },
        { p: [X1 - 0.04, F + 0.55, (S1 + DOOR0) / 2] as const, a: [0.06, 1.1, S1 - DOOR0] as const },
        { p: [X1 - 0.04, F + 0.55, (DOOR1 + Z1) / 2] as const, a: [0.06, 1.1, DOOR1 - Z1] as const },
        { p: [0, F + 0.55, Z1 + 0.04] as const, a: [W, 1.1, 0.06] as const },
      ].map(({ p, a }, i) => (
        <mesh key={i} position={[...p]} material={m.walnut}>
          <boxGeometry args={[...a]} />
        </mesh>
      ))}
      {fillets.map((f, i) => (
        <mesh key={i} position={[f.x, (F + 1.1 + CEIL - 0.3) / 2, f.z]} rotation={[0, f.ry, 0]} material={m.brass}>
          <boxGeometry args={[0.03, CEIL - 0.3 - F - 1.1, 0.02]} />
        </mesh>
      ))}
      {/* half-moon sconces glowing up the lacquer */}
      {fillets
        .filter((_, i) => i % 3 === 1)
        .map((f, i) => (
          <group key={`s${i}`} position={[f.x, F + 2.3, f.z]} rotation={[0, f.ry, 0]}>
            <mesh position={[0, 0, 0.06]} material={m.lampShade}>
              <cylinderGeometry args={[0.16, 0.16, 0.12, 16, 1, true, -Math.PI / 2, Math.PI]} />
            </mesh>
            <mesh position={[0, -0.07, 0.06]} material={m.brass}>
              <cylinderGeometry args={[0.17, 0.17, 0.02, 16, 1, false, -Math.PI / 2, Math.PI]} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/** Glazed French doors to the winter garden, folded open, in a gilt frame; the glass house shows beyond. */
function GardenDoors() {
  const m = useMats();
  const h = WINTER.doorH;
  const w = WINTER.doorHalf;
  return (
    <group position={[X1, F, WINTER.doorZ]}>
      {/* reveal through the wall's thickness */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.2, h / 2, s * w]} material={m.panel}>
          <boxGeometry args={[0.4, h, 0.02]} />
        </mesh>
      ))}
      <mesh position={[0.2, h, 0]} material={m.panel}>
        <boxGeometry args={[0.4, 0.02, w * 2]} />
      </mesh>
      {/* gilt architrave on the salon side */}
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} position={[-0.03, h / 2, s * (w + 0.06)]} material={m.gilt}>
          <boxGeometry args={[0.05, h + 0.1, 0.1]} />
        </mesh>
      ))}
      <mesh position={[-0.03, h + 0.05, 0]} material={m.gilt}>
        <boxGeometry args={[0.05, 0.1, w * 2 + 0.22]} />
      </mesh>
      {/* the two leaves, folded fully open into the salon: walnut frames around tall panes */}
      {[-1, 1].map((s) => (
        <group key={`l${s}`} position={[-0.02 - w / 2, 0, s * (w - 0.03)]}>
          {[-1, 1].map((k) => (
            <mesh key={`st${k}`} position={[(k * (w - 0.12)) / 2, h / 2, 0]} material={m.darkWood}>
              <boxGeometry args={[0.08, h, 0.05]} />
            </mesh>
          ))}
          {[0.06, 0.75, h - 0.06].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={m.darkWood}>
              <boxGeometry args={[w - 0.04, y === 0.75 ? 0.06 : 0.12, 0.05]} />
            </mesh>
          ))}
          <mesh position={[0, 0.4, 0]} material={m.darkWood}>
            <boxGeometry args={[w - 0.1, 0.6, 0.03]} />
          </mesh>
          <mesh position={[0, (0.78 + h - 0.12) / 2, 0]} material={coupe}>
            <boxGeometry args={[w - 0.16, h - 0.9, 0.01]} />
          </mesh>
          <mesh position={[(-(w - 0.2)) / 2 + 0.02, 1.05, s * 0.04]} material={m.brass}>
            <boxGeometry args={[0.03, 0.22, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* threshold */}
      <mesh position={[0.2, 0.01, 0]} material={m.brass}>
        <boxGeometry args={[0.4, 0.02, w * 2]} />
      </mesh>
    </group>
  );
}

/** Lacquered ceiling with a brass grid and an oval glowing cove above the bar. */
function Ceiling() {
  const m = useMats();
  const lux = luxuryMats();
  const cove = useMemo(() => {
    const g = ellipseRing(ISLAND.rx + 1.2, ISLAND.rz + 1.0, 0.18, 0.04);
    return g;
  }, []);
  return (
    <group>
      <mesh position={[0, CEIL, (Z0 + Z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={lacquer}>
        <planeGeometry args={[W, Z0 - Z1]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => X0 + (i + 1) * (W / 7)).map((x) => (
        <mesh key={`gx${x}`} position={[x, CEIL - 0.02, (Z0 + Z1) / 2]} material={m.brass}>
          <boxGeometry args={[0.03, 0.03, Z0 - Z1]} />
        </mesh>
      ))}
      {[-23.6, -26.6, -29.6].map((z) => (
        <mesh key={`gz${z}`} position={[0, CEIL - 0.02, z]} material={m.brass}>
          <boxGeometry args={[W, 0.03, 0.03]} />
        </mesh>
      ))}
      <mesh geometry={cove} position={[ISLAND.x, CEIL - 0.06, ISLAND.z]} material={lux.cove} />
    </group>
  );
}

/** Vestibule, three marble steps the full width of the room, and the raised walnut floor. */
function Floors() {
  const m = useMats();
  const lux = luxuryMats();
  const vest = useMemo(() => lux.nero(W, Z0 - S0), [lux]);
  const steps = [0, 1, 2].map((k) => ({ z0: S0 - k * STEP, h: (k + 1) * (F / 3) }));
  return (
    <group>
      <mesh position={[0, 0.005, (Z0 + S0) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={vest}>
        <planeGeometry args={[W, Z0 - S0]} />
      </mesh>
      {steps.map(({ z0, h }, k) => {
        const z1 = k === 2 ? Z1 : z0 - STEP;
        return (
          <group key={k}>
            <mesh position={[0, h / 2, (z0 + z1) / 2]} material={k === 2 ? m.darkWood : m.marble}>
              <boxGeometry args={[W, h, z0 - z1]} />
            </mesh>
            {/* brass nosing on each step */}
            <mesh position={[0, h - 0.01, z0 - 0.02]} material={m.brass}>
              <boxGeometry args={[W, 0.025, 0.04]} />
            </mesh>
          </group>
        );
      })}
      {/* brass handrails at each end of the steps */}
      {[X0 + 0.5, X1 - 0.5].map((x) => (
        <group key={x}>
          {[S0 + 0.1, S1 - 0.1].map((z, i) => (
            <mesh key={z} position={[x, (i ? F : 0) + 0.45, z]} material={m.brass}>
              <cylinderGeometry args={[0.03, 0.03, 0.9, 10]} />
            </mesh>
          ))}
          <mesh position={[x, 0.9 + F / 2, (S0 + S1) / 2]} rotation={[Math.atan2(F, S0 - S1) + Math.PI / 2, 0, 0]} material={m.brass}>
            <cylinderGeometry args={[0.022, 0.022, Math.hypot(F, S0 - S1) + 0.2, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Invisible walls, the stepped ramp and the raised floor, so the guest can walk up into the bar. */
function SalonColliders() {
  const run = S0 - S1 + 0.2;
  const angle = Math.atan2(F, run);
  const len = Math.hypot(F, run);
  const t = 0.05;
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        args={[W / 2, t, len / 2]}
        position={[0, F / 2 - Math.cos(angle) * t, (S0 + 0.1 + S1 - 0.1) / 2]}
        rotation={[angle, 0, 0]}
      />
      <CuboidCollider args={[W / 2, F / 2, (S1 - 0.1 - Z1) / 2]} position={[0, F / 2, (S1 - 0.1 + Z1) / 2]} />
      {/* walls */}
      <CuboidCollider args={[0.2, CEIL / 2, (Z0 - Z1) / 2]} position={[X0 - 0.2, CEIL / 2, (Z0 + Z1) / 2]} />
      <CuboidCollider args={[0.2, CEIL / 2, (Z0 - DOOR0) / 2]} position={[X1 + 0.2, CEIL / 2, (Z0 + DOOR0) / 2]} />
      <CuboidCollider args={[0.2, CEIL / 2, (DOOR1 - Z1) / 2]} position={[X1 + 0.2, CEIL / 2, (DOOR1 + Z1) / 2]} />
      <CuboidCollider args={[W / 2, CEIL / 2, 0.2]} position={[0, CEIL / 2, Z1 - 0.2]} />
      {/* furniture */}
      <CuboidCollider args={[ISLAND.rx + 0.1, 0.6, ISLAND.rz + 0.1]} position={[ISLAND.x, F + 0.6, ISLAND.z]} />
      <CuboidCollider args={[0.5, 0.6, 3.1]} position={[X0 + 0.5, F + 0.6, -26.9]} />
      <CuboidCollider args={[1.2, 0.6, 1.25]} position={[7.9, F + 0.6, -27.1]} />
      <CuboidCollider args={[1.3, 0.8, 0.4]} position={[-3, F + 0.8, Z1 + 0.2]} />
    </RigidBody>
  );
}

/**
 * The bar salon, through the arch at the back of the dining room: darker, lower and more intimate, with an
 * oval island bar, a velvet lounge, a fireplace and a grand piano.
 */
export default function BarSalon() {
  const stools = useMemo(() => {
    const out: [number, number][] = [];
    for (const t of [0.25, 0.7, 1.15, 2.55, 2.95, 3.5, 4.1, 4.7, 5.3, 5.85]) {
      out.push([ISLAND.x + Math.cos(t) * (ISLAND.rx + 0.5), ISLAND.z + Math.sin(t) * (ISLAND.rz + 0.5)]);
    }
    return out;
  }, []);
  return (
    <group>
      <Floors />
      <Walls />
      <Ceiling />
      <IslandBar />
      {stools.map(([x, z]) => (
        <Stool key={`${x}${z}`} x={x} z={z} />
      ))}
      <Lounge />
      <Fireplace x={-3} />
      <GrandPiano x={7.05} z={-27.1} />
      <SalonColliders />
      <pointLight color="#ffc98a" intensity={9} distance={10} decay={1.8} position={[ISLAND.x, CEIL - 1.3, ISLAND.z]} />
    </group>
  );
}

