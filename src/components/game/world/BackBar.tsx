"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { barGlow } from "@/game/atmosphere";
import { useMats } from "@/game/materials";
import { ROOM } from "@/game/layout";

/**
 * The back bar behind the counter, built like a real Paris bar rather than painted: walnut bays with a smoky bronze
 * mirror behind, glass shelves edged in brass with a warm light strip under each, and real bottles standing on them,
 * grouped the way a barman would (cognacs together, wines together), each with its label and cap.
 * All bottles of one shape are a single instanced mesh, so the whole wall costs a handful of draw calls.
 */

const WALL = ROOM.minZ;
const BAYS = [-2.85, 0, 2.85];
const BAY_W = 2.6;
// The lowest shelf clears the espresso machine standing on the back bar.
const SHELVES = [1.74, 2.32, 2.9, 3.48];
const SHELF_D = 0.3;
const BOTTLE_Z = WALL + 0.17;

type Shape = "wine" | "cognac" | "square" | "slim";

/** Bottle profiles (radius, height in metres), turned on a lathe. */
const PROFILES: Record<Shape, { pts: [number, number][]; segs: number; r: number; label: [number, number] }> = {
  wine: { pts: [[0, 0], [0.036, 0], [0.037, 0.005], [0.037, 0.19], [0.03, 0.225], [0.014, 0.25], [0.013, 0.3], [0, 0.3]], segs: 16, r: 0.037, label: [0.06, 0.15] },
  cognac: { pts: [[0, 0], [0.045, 0], [0.056, 0.05], [0.055, 0.12], [0.04, 0.16], [0.016, 0.18], [0.015, 0.23], [0, 0.23]], segs: 16, r: 0.056, label: [0.04, 0.11] },
  // four sides, turned 45 degrees: a square whisky bottle
  square: { pts: [[0, 0], [0.058, 0], [0.06, 0.006], [0.06, 0.2], [0.045, 0.22], [0.017, 0.235], [0.016, 0.27], [0, 0.27]], segs: 4, r: 0.042, label: [0.06, 0.15] },
  slim: { pts: [[0, 0], [0.029, 0], [0.03, 0.005], [0.03, 0.22], [0.02, 0.27], [0.011, 0.29], [0.011, 0.34], [0, 0.34]], segs: 14, r: 0.03, label: [0.08, 0.18] },
};

/** Glass and what is inside it: cognac amber, whisky gold, dark wine green, clear gin, the odd cobalt or ruby liqueur. */
const GLASS: Record<Shape, string[]> = {
  wine: ["#1d2a17", "#24331c", "#3a1015", "#1a2416"],
  cognac: ["#7a3a0e", "#8f4a14", "#5e2a0a", "#a35a1c"],
  square: ["#a8681c", "#8a5214", "#c58a2e", "#6e3c10"],
  slim: ["#d9d6cb", "#c9d2c8", "#1f2b55", "#5c1018", "#d8cfa8"],
};
const LABELS = ["#efe6d2", "#f3ecdd", "#141210", "#e9dcc0", "#2a1a12", "#c9b27a"];

type Bottle = { x: number; y: number; s: number; glass: string; label: string };

/** Where every bottle stands: the same arrangement on every visit. */
const BOTTLES = (() => {
  {
    let rnd = 7;
    const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const out: Record<Shape, Bottle[]> = { wine: [], cognac: [], square: [], slim: [] };
    const order: Shape[] = ["cognac", "square", "slim", "wine"];
    SHELVES.forEach((y, si) => {
      BAYS.forEach((bx, bi) => {
        // Each bay and shelf holds two or three groups of one kind, with a little air between groups.
        let x = bx - BAY_W / 2 + 0.12;
        const end = bx + BAY_W / 2 - 0.12;
        let k = (si * 3 + bi) % order.length;
        while (x < end) {
          const shape = order[k++ % order.length];
          const n = 3 + Math.floor(rand() * 4);
          const glass = GLASS[shape][Math.floor(rand() * GLASS[shape].length)];
          for (let i = 0; i < n && x < end; i++) {
            const r = PROFILES[shape].r;
            x += r;
            if (x + r > end) break;
            out[shape].push({ x: x + (rand() - 0.5) * 0.006, y: y + 0.012, s: 0.92 + rand() * 0.14, glass: rand() < 0.75 ? glass : GLASS[shape][Math.floor(rand() * GLASS[shape].length)], label: LABELS[Math.floor(rand() * LABELS.length)] });
            x += r + 0.012;
          }
          x += 0.07 + rand() * 0.06;
        }
      });
    });
    return out;
  }
})();

function BottleSet({ shape, items }: { shape: Shape; items: Bottle[] }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const label = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  const p = PROFILES[shape];
  const geo = useMemo(() => {
    const g = new THREE.LatheGeometry(p.pts.map(([r, y]) => new THREE.Vector2(r, y)), p.segs);
    if (p.segs === 4) g.rotateY(Math.PI / 4);
    g.computeVertexNormals();
    return g;
  }, [p]);
  const top = p.pts[p.pts.length - 1][1];
  const neck = p.pts[p.pts.length - 2][0];
  const labelGeo = useMemo(() => {
    const [y0, y1] = p.label;
    if (p.segs === 4) return new THREE.BoxGeometry(p.r * 2 * 1.02 + 0.002, y1 - y0, 0.004).translate(0, (y0 + y1) / 2, p.r * 1.01 + 0.002);
    const g = new THREE.CylinderGeometry(p.r + 0.0015, p.r + 0.0015, y1 - y0, p.segs, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
    return g.translate(0, (y0 + y1) / 2, 0);
  }, [p]);
  const capGeo = useMemo(() => new THREE.CylinderGeometry(neck + 0.002, neck + 0.002, 0.035, 10).translate(0, top - 0.012, 0), [neck, top]);

  useLayoutEffect(() => {
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    items.forEach((b, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 5) * 0.04 - 0.08);
      mtx.compose(new THREE.Vector3(b.x, b.y, BOTTLE_Z), q, new THREE.Vector3(1, b.s, 1));
      body.current?.setMatrixAt(i, mtx);
      label.current?.setMatrixAt(i, mtx);
      cap.current?.setMatrixAt(i, mtx);
      body.current?.setColorAt(i, c.set(b.glass));
      label.current?.setColorAt(i, c.set(b.label));
      cap.current?.setColorAt(i, c.set(i % 3 ? "#1a1412" : "#b08a3e"));
    });
    for (const im of [body.current, label.current, cap.current]) {
      if (!im) continue;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
    }
  }, [items]);

  return (
    <>
      <instancedMesh ref={body} args={[geo, undefined, items.length]}>
        <meshStandardMaterial roughness={0.08} metalness={0.1} envMapIntensity={1.6} />
      </instancedMesh>
      <instancedMesh ref={label} args={[labelGeo, undefined, items.length]}>
        <meshStandardMaterial roughness={0.7} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={cap} args={[capGeo, undefined, items.length]}>
        <meshStandardMaterial roughness={0.35} metalness={0.6} />
      </instancedMesh>
    </>
  );
}

export default function BackBar() {
  const m = useMats();
  const bottles = BOTTLES;
  const top = SHELVES[SHELVES.length - 1] + 0.6;
  const bottom = 1.06;
  const midY = (top + bottom) / 2;
  const height = top - bottom;
  return (
    <group>
      {/* smoky bronze mirror behind the shelves, softly lit from behind at night */}
      {BAYS.map((x) => (
        <mesh key={`m${x}`} position={[x, midY, WALL + 0.02]}>
          <planeGeometry args={[BAY_W, height]} />
          <meshStandardMaterial ref={barGlow} color="#2a1d14" metalness={0.85} roughness={0.18} emissive="#5a3416" emissiveIntensity={0.35} envMapIntensity={1.4} />
        </mesh>
      ))}
      {/* walnut pilasters between the bays, with gilt capitals and a cornice over the whole wall */}
      {[-4.2, -1.425, 1.425, 4.2].map((x) => (
        <group key={`p${x}`}>
          <mesh position={[x, midY, WALL + 0.17]} material={m.walnut}>
            <boxGeometry args={[0.16, height, 0.34]} />
          </mesh>
          <mesh position={[x, top - 0.06, WALL + 0.2]} material={m.gilt}>
            <boxGeometry args={[0.22, 0.08, 0.36]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, top + 0.06, WALL + 0.2]} material={m.walnut}>
        <boxGeometry args={[8.7, 0.16, 0.4]} />
      </mesh>
      <mesh position={[0, top + 0.15, WALL + 0.22]} material={m.gilt}>
        <boxGeometry args={[8.8, 0.04, 0.44]} />
      </mesh>
      {/* glass shelves with brass nosing and a warm light strip beneath each */}
      {SHELVES.map((y) =>
        BAYS.map((x) => (
          <group key={`s${y}${x}`}>
            <mesh position={[x, y, WALL + SHELF_D / 2 + 0.02]} material={m.glassDim}>
              <boxGeometry args={[BAY_W, 0.018, SHELF_D]} />
            </mesh>
            <mesh position={[x, y, WALL + SHELF_D + 0.025]} material={m.brass}>
              <boxGeometry args={[BAY_W, 0.03, 0.012]} />
            </mesh>
            <mesh position={[x, y - 0.014, WALL + 0.06]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[BAY_W - 0.04, 0.02]} />
              <meshStandardMaterial ref={barGlow} color="#000000" emissive="#ffc27a" emissiveIntensity={2.2} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )),
      )}
      {(Object.keys(bottles) as Shape[]).map((s) => (
        <BottleSet key={s} shape={s} items={bottles[s]} />
      ))}
    </group>
  );
}
