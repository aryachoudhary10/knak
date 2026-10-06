"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMats } from "@/game/materials";
import { luxuryMats } from "@/game/luxury";
import { ROOM } from "@/game/layout";

const H = ROOM.height;
const X0 = ROOM.minX, X1 = ROOM.maxX;
const Z0 = ROOM.minZ, Z1 = ROOM.maxZ - 0.4; // inner face of the facade wall
const BEAM = 0.34; // how far the coffer beams hang below the ceiling
const CX = 4.6; // the long beams framing the central vault
const CROSS = [-1.7, -6.7, -11.7, -16.7]; // cross beams; chandeliers hang in the middle of each bay

type Box = [sx: number, sy: number, sz: number, x: number, y: number, z: number];

function merged(boxes: Box[]) {
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.Matrix4();
  const parts = boxes.map(([sx, sy, sz, x, y, z]) => unit.clone().applyMatrix4(m.makeScale(sx, sy, sz).setPosition(x, y, z)));
  return mergeGeometries(parts);
}

/** A rectangular moulding frame lying flat on the ceiling plane. */
function frame(boxes: Box[], cx: number, cz: number, w: number, d: number, t: number, depth: number, y: number) {
  boxes.push([w, depth, t, cx, y, cz - d / 2], [w, depth, t, cx, y, cz + d / 2]);
  boxes.push([t, depth, d, cx - w / 2, y, cz], [t, depth, d, cx + w / 2, y, cz]);
}

/**
 * A Belle Époque coffered ceiling: a central vault of three painted sky frescoes in gilded frames with warm
 * cove light, side bays of smaller coffers with rosettes, and a deep crown cornice with dentils.
 * Everything is merged into a few meshes, so it costs a handful of draw calls.
 */
export default function Ceiling() {
  const m = useMats();
  const lux = luxuryMats();
  const dentils = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => {
    const cream: Box[] = [];
    const gilt: Box[] = [];
    const cove: Box[] = [];
    const len = Z1 - Z0;
    const midZ = (Z0 + Z1) / 2;
    // long beams either side of the vault
    for (const s of [-1, 1]) {
      cream.push([0.42, BEAM, len, s * CX, H - BEAM / 2, midZ]);
      for (const e of [-1, 1]) gilt.push([0.03, 0.03, len, s * CX + e * 0.21, H - BEAM, midZ]);
    }
    // cross beams
    for (const z of CROSS) {
      cream.push([X1 - X0, BEAM, 0.42, 0, H - BEAM / 2, z]);
      for (const e of [-1, 1]) gilt.push([X1 - X0, 0.03, 0.03, 0, H - BEAM, z + e * 0.21]);
    }
    // central vault bays: stepped gilt frame round each fresco, with a glowing cove just inside the beams
    for (let i = 0; i < CROSS.length - 1; i++) {
      const cz = (CROSS[i] + CROSS[i + 1]) / 2;
      const w = CX * 2 - 0.42;
      const d = Math.abs(CROSS[i + 1] - CROSS[i]) - 0.42;
      frame(cream, 0, cz, w, d, 0.22, 0.12, H - 0.06);
      frame(gilt, 0, cz, w - 0.34, d - 0.34, 0.06, 0.05, H - 0.09);
      frame(cove, 0, cz, w - 0.04, d - 0.04, 0.03, 0.02, H - BEAM + 0.04);
      frame(gilt, 0, cz, w - 1.0, d - 1.0, 0.035, 0.03, H - 0.03);
    }
    // side bays: small coffers each with a gilt frame and rosette
    const sideZ: number[] = [];
    for (let z = Z1; z > Z0 + 0.1; z -= (Z1 - Z0) / 8) sideZ.push(z);
    for (const s of [-1, 1]) {
      const inner = s * (CX + 0.21);
      const outer = s * (X1 - 0.5);
      const cx = (inner + outer) / 2;
      const w = Math.abs(outer - inner);
      for (let k = 0; k < 8; k++) {
        const za = Z1 - (k * (Z1 - Z0)) / 8;
        const zb = Z1 - ((k + 1) * (Z1 - Z0)) / 8;
        const cz = (za + zb) / 2;
        if (k > 0) cream.push([w, 0.18, 0.2, cx, H - 0.09, za]);
        frame(gilt, cx, cz, w - 0.55, Math.abs(za - zb) - 0.55, 0.04, 0.03, H - 0.03);
        gilt.push([0.16, 0.05, 0.16, cx, H - 0.025, cz]);
      }
    }
    // crown cornice: stepped cream profile with a gilt fillet, all round
    const ring = (inset: number, height: number, depth: number, y: number, list: Box[]) => {
      list.push([depth, height, len, X0 + inset, y, midZ], [depth, height, len, X1 - inset, y, midZ]);
      list.push([X1 - X0, height, depth, 0, y, Z0 + inset], [X1 - X0, height, depth, 0, y, Z1 - inset]);
    };
    ring(0.25, 0.2, 0.5, H - 0.1, cream);
    ring(0.17, 0.16, 0.34, H - 0.28, cream);
    ring(0.19, 0.03, 0.38, H - 0.375, gilt);
    ring(0.12, 0.08, 0.24, H - 0.43, cream);
    return { cream: merged(cream), gilt: merged(gilt), cove: merged(cove) };
  }, []);

  // dentils under the cornice, as one instanced mesh
  const dentilSpots = useMemo(() => {
    const spots: [number, number, number][] = [];
    const y = H - 0.32;
    for (let z = Z0 + 0.4; z < Z1 - 0.3; z += 0.15) spots.push([X0 + 0.36, y, z], [X1 - 0.36, y, z]);
    for (let x = X0 + 0.4; x < X1 - 0.3; x += 0.15) spots.push([x, y, Z0 + 0.36], [x, y, Z1 - 0.36]);
    return spots;
  }, []);
  useLayoutEffect(() => {
    const mesh = dentils.current;
    if (!mesh) return;
    const mtx = new THREE.Matrix4();
    dentilSpots.forEach((p, i) => mesh.setMatrixAt(i, mtx.makeTranslation(p[0], p[1], p[2])));
    mesh.instanceMatrix.needsUpdate = true;
  }, [dentilSpots]);

  const frescoes = useMemo(
    () =>
      CROSS.slice(0, -1).map((z, i) => ({
        z: (z + CROSS[i + 1]) / 2,
        d: Math.abs(CROSS[i + 1] - z) - 1.42,
        mat: lux.fresco(i + 1),
      })),
    [lux],
  );

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, (Z0 + Z1) / 2]} material={lux.cream}>
        <planeGeometry args={[X1 - X0, Z1 - Z0 + 0.4]} />
      </mesh>
      {frescoes.map((f) => (
        <mesh key={f.z} rotation={[Math.PI / 2, 0, 0]} position={[0, H - 0.005, f.z]} material={f.mat}>
          <planeGeometry args={[CX * 2 - 1.42, f.d]} />
        </mesh>
      ))}
      <mesh geometry={geo.cream} material={lux.cream} />
      <mesh geometry={geo.gilt} material={m.gilt} />
      <mesh geometry={geo.cove} material={lux.cove} />
      <instancedMesh ref={dentils} args={[undefined, undefined, dentilSpots.length]} material={lux.creamShade} frustumCulled={false}>
        <boxGeometry args={[0.06, 0.08, 0.06]} />
      </instancedMesh>
    </group>
  );
}
