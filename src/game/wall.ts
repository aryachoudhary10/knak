import * as THREE from "three";
import { LEFT_WALL, WINDOWS } from "./layout";

let geo: THREE.BufferGeometry | null = null;

/**
 * The left wall as one solid with arched openings cut through it: plaster inside, stone outside, and a deep
 * reveal between, so the windows look onto the actual garden, lanes and neighbouring buildings.
 */
export function leftWallGeometry() {
  if (geo) return geo;
  const { inner, outer, back, height } = LEFT_WALL;
  const shape = new THREE.Shape();
  shape.moveTo(back, 0);
  shape.lineTo(0, 0);
  shape.lineTo(0, height);
  shape.lineTo(back, height);
  shape.lineTo(back, 0);
  for (const z of WINDOWS.z) {
    const w = WINDOWS.halfWidth;
    const hole = new THREE.Path();
    hole.moveTo(z - w, WINDOWS.sill);
    hole.lineTo(z + w, WINDOWS.sill);
    hole.lineTo(z + w, WINDOWS.spring);
    hole.absarc(z, WINDOWS.spring, w, 0, Math.PI, false);
    hole.lineTo(z - w, WINDOWS.sill);
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: inner - outer, bevelEnabled: false, curveSegments: 16 });
  // Shape x is world z and extrusion runs outward, toward -x.
  g.rotateY(-Math.PI / 2);
  g.translate(inner, 0, 0);
  g.computeVertexNormals();
  geo = g;
  return g;
}
