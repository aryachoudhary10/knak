import * as THREE from "three";
import { BAR_ARCH, RIGHT_WINDOWS, ROOM, SIDE_WALL, WINDOWS, type WindowSet } from "./layout";

const geos: Partial<Record<"left" | "right", THREE.BufferGeometry>> = {};

/**
 * A side wall as one solid with arched openings cut through it: plaster inside, stone outside, and a deep
 * reveal between, so the windows look onto the actual garden, lanes and neighbouring buildings.
 */
export function sideWallGeometry(side: "left" | "right") {
  const cached = geos[side];
  if (cached) return cached;
  const { inner, outer, back, height } = SIDE_WALL;
  const win: WindowSet = side === "left" ? WINDOWS : RIGHT_WINDOWS;
  const shape = new THREE.Shape();
  shape.moveTo(back, 0);
  shape.lineTo(0, 0);
  shape.lineTo(0, height);
  shape.lineTo(back, height);
  shape.lineTo(back, 0);
  for (const z of win.z) {
    const w = win.halfWidth;
    const hole = new THREE.Path();
    hole.moveTo(z - w, win.sill);
    hole.lineTo(z + w, win.sill);
    hole.lineTo(z + w, win.spring);
    hole.absarc(z, win.spring, w, 0, Math.PI, false);
    hole.lineTo(z - w, win.sill);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: inner - outer, bevelEnabled: false, curveSegments: 16 });
  // Shape x is world z and extrusion runs toward -x; the right wall is the same solid moved across.
  g.rotateY(-Math.PI / 2);
  g.translate(side === "left" ? inner : -outer, 0, 0);
  g.computeVertexNormals();
  geos[side] = g;
  return g;
}

let backGeo: THREE.BufferGeometry | null = null;

/** The back wall of the dining room, with the arch through to the bar salon cut into it. */
export function backWallGeometry(height: number, thickness = 0.4) {
  if (backGeo) return backGeo;
  const shape = new THREE.Shape();
  shape.moveTo(ROOM.minX, 0);
  shape.lineTo(ROOM.maxX, 0);
  shape.lineTo(ROOM.maxX, height);
  shape.lineTo(ROOM.minX, height);
  shape.lineTo(ROOM.minX, 0);
  const { x, halfWidth: w, spring } = BAR_ARCH;
  const hole = new THREE.Path();
  hole.moveTo(x - w, 0.001);
  hole.lineTo(x + w, 0.001);
  hole.lineTo(x + w, spring);
  hole.absarc(x, spring, w, 0, Math.PI, false);
  hole.lineTo(x - w, 0.001);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, ROOM.minZ - thickness);
  g.computeVertexNormals();
  backGeo = g;
  return g;
}
