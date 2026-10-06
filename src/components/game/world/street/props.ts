import * as THREE from "three";
import { Batch, canopy, prism } from "./kit";
import type { Rnd } from "./buildings";
import { ATLAS, WIN } from "./textures";

/** Street furniture and ground surfaces, all merged into the shared Batch. */

export const ROAD_Y = -0.12;
/** Main road z 9..19, side street road x between these, running away from the café. */
export const SIDE = { roadX0: -4.5, roadX1: 1.5, left: -7, right: 4, start: 23, end: 165 } as const;

const LAMP_GLOW: [number, number, number] = [3.2, 2.15, 1.15];

function flat(b: Batch, part: "paving" | "road", x0: number, x1: number, z0: number, z1: number, y: number, color: THREE.ColorRepresentation, tile = 3) {
  b.plane(part, x1 - x0, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, color, { rx: -Math.PI / 2, uvScale: [(x1 - x0) / tile, (z1 - z0) / (tile * 0.6)] });
}

export function ground(b: Batch) {
  const pave = "#ffffff";
  const asphalt = "#3a3935";
  const gutter = "#55514a";
  const kerb = "#9c968a";
  // pavements
  flat(b, "paving", -150, 150, 0, 9.15, 0, pave);
  flat(b, "paving", -150, SIDE.roadX0, 18.85, 23, 0, pave);
  flat(b, "paving", SIDE.roadX1, 150, 18.85, 23, 0, pave);
  flat(b, "paving", SIDE.left, SIDE.roadX0, 23, SIDE.end, 0, pave);
  flat(b, "paving", SIDE.roadX1, SIDE.right, 23, SIDE.end, 0, pave);
  // roads with cobbled gutters
  flat(b, "road", -200, 200, 9.15, 18.85, ROAD_Y, asphalt);
  flat(b, "road", SIDE.roadX0, SIDE.roadX1, 18.85, SIDE.end + 5, ROAD_Y, asphalt);
  flat(b, "road", -200, 200, 9.15, 9.55, ROAD_Y + 0.004, gutter);
  flat(b, "road", -200, SIDE.roadX0, 18.45, 18.85, ROAD_Y + 0.004, gutter);
  flat(b, "road", SIDE.roadX1, 200, 18.45, 18.85, ROAD_Y + 0.004, gutter);
  // kerbs
  b.box("paint", 300, 0.14, 0.24, 0, -0.06, 9.1, kerb);
  b.box("paint", 150 + SIDE.roadX0, 0.14, 0.24, (-150 + SIDE.roadX0) / 2, -0.06, 18.9, kerb);
  b.box("paint", 150 - SIDE.roadX1, 0.14, 0.24, (150 + SIDE.roadX1) / 2, -0.06, 18.9, kerb);
  b.box("paint", 0.24, 0.14, SIDE.end - 18.9, SIDE.roadX0, -0.06, (SIDE.end + 18.9) / 2, kerb);
  b.box("paint", 0.24, 0.14, SIDE.end - 18.9, SIDE.roadX1, -0.06, (SIDE.end + 18.9) / 2, kerb);
  // lane markings: dashed centre line and a zebra crossing from the café to the side street
  const paint = "#cfcbc0";
  for (let x = -200; x < 200; x += 9) if (x < -5 || x > 3) b.box("road", 3, 0.01, 0.13, x, ROAD_Y + 0.006, 14, paint);
  for (let z = 10; z < 18.5; z += 1.0) b.box("road", 3.6, 0.01, 0.5, -1.5, ROAD_Y + 0.006, z, paint);
  for (let x = SIDE.roadX0 + 0.5; x < SIDE.roadX1 - 0.3; x += 1.0) b.box("road", 0.5, 0.01, 3.2, x, ROAD_Y + 0.006, 21.2, paint);
  for (let z = 30; z < SIDE.end; z += 9) b.box("road", 0.12, 0.01, 3, (SIDE.roadX0 + SIDE.roadX1) / 2, ROAD_Y + 0.006, z, paint);
}

/** Paris "candélabre": fluted cast-iron post with a glowing lantern and a fake pool of light. */
export function lamp(b: Batch, x: number, z: number, poolDir: [number, number] = [0, -1.2]) {
  const iron = "#1b2420";
  b.cyl("iron", 0.17, 0.24, 0.7, 8, x, 0.35, z, iron);
  b.cyl("iron", 0.2, 0.2, 0.08, 8, x, 0.74, z, iron);
  b.cyl("iron", 0.065, 0.1, 3.3, 8, x, 2.4, z, iron);
  b.cyl("iron", 0.12, 0.07, 0.18, 8, x, 4.1, z, iron);
  b.cyl("lit", 0.26, 0.16, 0.55, 4, x, 4.48, z, LAMP_GLOW, { uv: WIN.white, ry: Math.PI / 4 });
  b.cyl("iron", 0.06, 0.38, 0.28, 4, x, 4.89, z, iron, { ry: Math.PI / 4 });
  b.cyl("iron", 0.02, 0.05, 0.25, 6, x, 5.12, z, iron);
  b.plane("glow", 6.5, 6.5, x + poolDir[0], 0.015, z + poolDir[1], [0.3, 0.19, 0.09], { rx: -Math.PI / 2 });
}

/** London plane tree with a cast-iron grate. */
export function tree(b: Batch, r: Rnd, x: number, z: number, detail = 2) {
  const h = 4.2 + r() * 1.2;
  const bark = new THREE.Color("#8d8a74").multiplyScalar(0.85 + r() * 0.25);
  b.cyl("iron", 0.75, 0.75, 0.025, 16, x, 0.012, z, "#1c1c1a");
  b.cyl("paint", 0.17, 0.26, h, 7, x, h / 2, z, bark);
  const forks = 2 + Math.floor(r() * 2);
  for (let f = 0; f < forks; f++) {
    const a = (f / forks) * Math.PI * 2 + r();
    const tilt = 0.35 + r() * 0.25;
    const len = 2.2 + r();
    b.cyl("paint", 0.08, 0.15, len, 6, x + Math.cos(a) * Math.sin(tilt) * len * 0.5, h + Math.cos(tilt) * len * 0.5 - 0.1, z + Math.sin(a) * Math.sin(tilt) * len * 0.5, bark, { rz: -Math.cos(a) * tilt, rx: Math.sin(a) * tilt });
  }
  const lumps = 7 + Math.floor(r() * 4);
  for (let k = 0; k < lumps; k++) {
    const a = r() * Math.PI * 2;
    const d = k === 0 ? 0 : 1.0 + r() * 1.6;
    const s = 1.2 + r() * 0.8;
    const g = 0.8 + r() * 0.5;
    const warm = r() * 0.25;
    const leaf: [number, number, number] = [(0.075 + warm * 0.1) * g, (0.13 + warm * 0.05) * g, 0.04 * g];
    b.geo("foliage", canopy(k + Math.floor(r() * 4), detail), x + Math.cos(a) * d, h + 1.4 + r() * 2.6 + (k === 0 ? 1.2 : 0), z + Math.sin(a) * d, leaf, { s: [s, s * 0.8, s], ry: r() * 6, jitter: 0.45 });
  }
}

export function morrisColumn(b: Batch, x: number, z: number) {
  const green = "#1e4a32";
  b.cyl("paint", 0.72, 0.78, 0.35, 16, x, 0.175, z, green);
  b.cyl("atlas", 0.6, 0.6, 2.7, 20, x, 1.7, z, "#ffffff", { uv: ATLAS.posters, open: true });
  b.cyl("paint", 0.57, 0.57, 2.7, 12, x, 1.7, z, green);
  b.cyl("paint", 0.74, 0.66, 0.2, 16, x, 3.12, z, green);
  b.cyl("paint", 0.62, 0.62, 0.45, 16, x, 3.44, z, green);
  b.cyl("paint", 0.8, 0.7, 0.14, 16, x, 3.72, z, green);
  b.cyl("paint", 0.18, 0.74, 0.7, 16, x, 4.14, z, green);
  b.cyl("paint", 0.06, 0.16, 0.4, 8, x, 4.66, z, green);
  b.cyl("paint", 0.09, 0.09, 0.1, 8, x, 4.9, z, "#b8923f");
}

export function wallaceFountain(b: Batch, x: number, z: number) {
  const g = "#1d3a2a";
  b.cyl("iron", 0.48, 0.55, 0.25, 8, x, 0.125, z, g);
  b.cyl("iron", 0.36, 0.42, 0.7, 8, x, 0.6, z, g);
  b.cyl("iron", 0.42, 0.36, 0.12, 8, x, 1.0, z, g);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    b.cyl("iron", 0.06, 0.08, 1.15, 6, x + Math.cos(a) * 0.24, 1.63, z + Math.sin(a) * 0.24, g);
    b.cyl("iron", 0.06, 0.06, 0.12, 6, x + Math.cos(a) * 0.24, 2.27, z + Math.sin(a) * 0.24, g);
  }
  b.cyl("iron", 0.08, 0.08, 0.9, 6, x, 1.6, z, g);
  b.cyl("iron", 0.44, 0.4, 0.1, 12, x, 2.36, z, g);
  b.cyl("iron", 0.12, 0.44, 0.38, 12, x, 2.6, z, g);
  b.cyl("iron", 0.03, 0.08, 0.3, 6, x, 2.94, z, g);
}

export function bench(b: Batch, x: number, z: number, rot: number) {
  b.at(x, 0, z, rot, () => {
    const wood = "#2f4a35";
    for (let i = 0; i < 4; i++) b.box("paint", 1.9, 0.035, 0.08, 0, 0.45, -0.18 + i * 0.11, wood);
    for (let i = 0; i < 3; i++) b.box("paint", 1.9, 0.08, 0.035, 0, 0.62 + i * 0.12, -0.27 - i * 0.025, wood, { rx: -0.2 });
    for (const sx of [-0.8, 0.8]) {
      b.box("iron", 0.05, 0.45, 0.5, sx, 0.22, 0, "#161a17");
      b.box("iron", 0.05, 0.5, 0.05, sx, 0.68, -0.28, "#161a17", { rx: -0.2 });
    }
  });
}

export function vespa(b: Batch, x: number, z: number, rot: number) {
  b.at(x, 0, z, rot, () => {
    const body = "#8fc2ad";
    b.cyl("iron", 0.2, 0.2, 0.1, 12, 0, 0.2, 0.62, "#111", { rz: Math.PI / 2 });
    b.cyl("iron", 0.2, 0.2, 0.1, 12, 0, 0.2, -0.55, "#111", { rz: Math.PI / 2 });
    b.box("car", 0.36, 0.08, 0.7, 0, 0.32, 0.05, body);
    b.geo("car", new THREE.SphereGeometry(0.34, 10, 8), 0, 0.5, -0.48, body, { s: [0.95, 0.8, 1.3] });
    b.box("car", 0.42, 0.75, 0.06, 0, 0.66, 0.46, body, { rx: -0.25 });
    b.box("car", 0.22, 0.08, 0.3, 0, 0.42, 0.62, body);
    b.cyl("iron", 0.025, 0.025, 0.7, 5, 0, 1.05, 0.55, "#c0c0c0", { rz: Math.PI / 2 });
    b.box("car", 0.3, 0.08, 0.55, 0, 0.82, -0.45, "#4a3020");
    b.cyl("lit", 0.07, 0.07, 0.05, 8, 0, 1.05, 0.62, [0.3, 0.3, 0.28], { uv: WIN.white, rx: Math.PI / 2 });
  });
}

const carBody = prism([[-2.05, 0.3], [2.05, 0.3], [2.08, 0.62], [1.95, 0.85], [-1.95, 0.92], [-2.07, 0.75]], 1.74);
const carCabin = prism([[-1.45, 0.9], [0.95, 0.88], [0.25, 1.42], [-1.15, 1.44]], 1.56);

/** A small European hatchback, parked. Local length along z, nose at +z. */
export function car(b: Batch, x: number, z: number, rot: number, paint: string) {
  b.at(x, 0, z, rot, () => {
    b.geo("car", carBody, -0.87, ROAD_Y, 0, paint);
    b.geo("car", carCabin, -0.78, ROAD_Y, 0, "#151b26");
    b.box("car", 1.5, 0.05, 1.3, 0, ROAD_Y + 1.45, -0.45, paint);
    for (const [wx, wz] of [[-0.78, 1.3], [0.78, 1.3], [-0.78, -1.3], [0.78, -1.3]]) b.cyl("iron", 0.31, 0.31, 0.2, 12, wx, ROAD_Y + 0.31, wz, "#111", { rz: Math.PI / 2 });
    for (const sx of [-0.6, 0.6]) {
      b.box("car", 0.3, 0.1, 0.04, sx, ROAD_Y + 0.72, 2.06, "#d9d6c8");
      b.box("car", 0.25, 0.12, 0.04, sx, ROAD_Y + 0.74, -2.08, "#6a1010");
    }
    b.box("iron", 1.6, 0.14, 0.12, 0, ROAD_Y + 0.42, 2.07, "#222");
    b.box("iron", 1.6, 0.14, 0.12, 0, ROAD_Y + 0.42, -2.07, "#222");
  });
}
