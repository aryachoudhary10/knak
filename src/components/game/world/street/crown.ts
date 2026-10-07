import * as THREE from "three";
import { Batch, canopy, prism } from "./kit";
import { WIN } from "./textures";
import { WINDOWS } from "@/game/layout";

/**
 * KNAK as a free-standing hôtel particulier: a balustraded crown and low zinc mansard over the
 * 8.2 m facade, dressed side walls, and walled gardens with a lantern-lit lane on either side.
 * The café occupies x -10..10, z -20.5..0; the facade itself lives in Facade.tsx.
 */

const STONE = "#efe7d6";
const LIT_STONE: [number, number, number] = [1.0, 0.86, 0.66];
const GILT = "#d4ab52";
const H = 8.2;
const BACK = -20.6;

let urnGeo: THREE.BufferGeometry | null = null;
function urn() {
  if (!urnGeo) {
    const p = [[0, 0], [0.16, 0], [0.16, 0.06], [0.08, 0.12], [0.08, 0.2], [0.22, 0.3], [0.25, 0.45], [0.18, 0.58], [0.12, 0.62], [0.14, 0.66], [0.04, 0.72], [0.05, 0.8], [0, 0.84]];
    urnGeo = new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 12);
  }
  return urnGeo;
}

/** A stone balustrade along local +x from 0 to len, facing +z. */
function balustrade(b: Batch, len: number, y: number, pedestals: number[]) {
  b.box("paint", len, 0.22, 0.62, len / 2, y + 0.11, 0, LIT_STONE);
  b.box("paint", len, 0.16, 0.66, len / 2, y + 1.0, 0, LIT_STONE);
  for (let x = 0.25; x < len - 0.1; x += 0.32) {
    if (pedestals.some((p) => Math.abs(p - x) < 0.4)) continue;
    b.cyl("paint", 0.05, 0.08, 0.38, 6, x, y + 0.42, 0, LIT_STONE);
    b.cyl("paint", 0.08, 0.05, 0.38, 6, x, y + 0.78, 0, LIT_STONE);
  }
  for (const p of pedestals) {
    b.box("paint", 0.62, 1.1, 0.72, p, y + 0.55, 0, LIT_STONE);
    b.box("paint", 0.72, 0.1, 0.8, p, y + 1.12, 0, STONE);
    b.geo("paint", urn(), p, y + 1.17, 0, LIT_STONE, { s: [1.3, 1.3, 1.3] });
  }
}

export function cafeCrown(b: Batch) {
  // closing walls so the building reads as a solid pavilion from the side gardens
  for (const s of [-1, 1]) {
    const x = s * 10.2;
    // The left wall is cut with real windows (see game/wall.ts), so only the right is a plain slab.
    if (s > 0) b.box("paint", 0.4, H, -BACK, x, H / 2, BACK / 2, STONE);
    b.box("paint", 0.6, 0.5, -BACK, x + s * 0.1, 0.25, BACK / 2, "#e2d6bf");
    b.box("paint", 0.7, 0.3, -BACK + 0.2, x + s * 0.12, 6.86, BACK / 2, "#e2d6bf");
    b.box("paint", 0.9, 0.3, -BACK + 0.4, x + s * 0.2, 8.0, BACK / 2, STONE);
    if (s < 0) {
      for (const z of WINDOWS.z) {
        b.box("paint", 0.25, 6.3, 0.7, x + s * 0.2, 3.15, z - 3.0, STONE);
        b.box("paint", 0.2, 0.25, 2.0, x + s * 0.25, WINDOWS.spring + WINDOWS.halfWidth + 0.3, z, "#e2d6bf");
        b.box("paint", 0.25, 0.12, 2.0, x + s * 0.27, WINDOWS.sill - 0.06, z, "#e2d6bf");
      }
      continue;
    }
    for (let k = 0; k < 4; k++) {
      const z = -2.6 - k * 5;
      b.box("paint", 0.25, 6.3, 0.7, x + s * 0.2, 3.15, z + 2.5, STONE);
      b.plane("lit", 1.5, 3.2, x + s * 0.21, 2.9, z, [1.05, 0.88, 0.62], { uv: WIN.sheer, ry: (s * Math.PI) / 2 });
      b.box("paint", 0.2, 0.25, 2.0, x + s * 0.25, 4.65, z, "#e2d6bf");
    }
  }
  b.box("paint", 20.8, H, 0.4, 0, H / 2, BACK - 0.2, STONE);

  // roof slab hiding the interior, and the parapet crown
  b.box("paint", 20.2, 0.3, -BACK, 0, H + 0.05, BACK / 2, "#cfc3aa");
  const pedestals = [0.0, 1.8, 7.65, 12.35, 18.2, 20.0];
  b.at(-10, 0, 0.18, 0, () => balustrade(b, 20, H + 0.18, pedestals));
  for (const s of [-1, 1]) b.at(s * 10.1, 0, 0.18, Math.PI / 2, () => balustrade(b, 20.6, H + 0.18, [0, 10.3, 20.6]));

  // central pediment over the door with a gilded cartouche
  const ped = prism([[-3.1, 0], [3.1, 0], [0, 1.45]], 0.7);
  b.geo("paint", ped, 0, H + 1.2, -0.35, LIT_STONE, { ry: -Math.PI / 2 });
  b.box("paint", 6.4, 0.22, 0.85, 0, H + 1.2, 0.0, STONE);
  b.geo("paint", prism([[-3.35, 0], [3.35, 0], [0, 1.58]], 0.5), 0, H + 1.38, -0.2, STONE, { ry: -Math.PI / 2 });
  b.cyl("paint", 0.48, 0.48, 0.08, 20, 0, H + 1.82, 0.38, GILT, { rx: Math.PI / 2 });
  b.cyl("lit", 0.36, 0.36, 0.06, 20, 0, H + 1.82, 0.42, [1.6, 1.2, 0.6], { uv: WIN.white, rx: Math.PI / 2 });
  b.geo("paint", urn(), 0, H + 2.95, 0.0, GILT, { s: [1.1, 1.1, 1.1] });
  // warm uplight halo on the crown
  for (const x of [-6.5, 0, 6.5]) b.plane("glow", 7, 4, x, H + 1.0, 0.75, [0.18, 0.11, 0.05]);

  // low zinc mansard set back behind the parapet, with lit oeils-de-boeuf
  const prof: [number, number][] = [[BACK + 0.4, H + 0.2], [-1.6, H + 0.2], [-2.9, H + 2.5], [-10.3, H + 3.1], [BACK + 1.9, H + 2.5]];
  b.geo("zinc", prism(prof, 19.2), -9.6, 0, 0, [0.95, 0.98, 1.05]);
  for (const x of [-6, -2, 2, 6]) {
    b.box("paint", 1.3, 1.3, 1.2, x, H + 1.0, -2.2, STONE);
    b.cyl("zinc", 0.68, 0.68, 1.22, 12, x, H + 1.65, -2.2, [0.95, 0.98, 1.05], { rx: Math.PI / 2 });
    b.cyl("lit", 0.36, 0.36, 0.04, 16, x, H + 1.05, -1.58, [1.3, 0.95, 0.55], { uv: WIN.white, rx: Math.PI / 2 });
  }
  b.plane("rail", 18, 0.45, 0, H + 3.3, -10.3, "#ffffff", { uvScale: [18, 1] });
  for (const x of [-9, 9]) b.box("paint", 0.9, 2.2, 1.6, x, H + 3.2, -10.3, "#c9bda6");
}

function hedge(b: Batch, x0: number, x1: number, z0: number, z1: number, h: number) {
  b.box("foliage", x1 - x0, h, z1 - z0, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, [0.05, 0.1, 0.035], { jitter: 0.25 });
}

function topiary(b: Batch, x: number, z: number, cone: boolean) {
  b.box("paint", 0.7, 0.6, 0.7, x, 0.3, z, "#e2d6bf");
  if (cone) b.cyl("foliage", 0.02, 0.45, 1.7, 10, x, 1.45, z, [0.06, 0.12, 0.04], { jitter: 0.25 });
  else {
    b.cyl("paint", 0.04, 0.04, 0.7, 5, x, 0.9, z, "#5a4a3a");
    b.geo("foliage", canopy(0, 2), x, 1.55, z, [0.06, 0.12, 0.04], { s: [0.5, 0.5, 0.5], jitter: 0.25 });
  }
  b.plane("glow", 2.2, 2.2, x, 0.62, z, [0.35, 0.22, 0.1], { rx: -Math.PI / 2 });
}

function lantern(b: Batch, x: number, z: number) {
  b.cyl("iron", 0.04, 0.07, 2.2, 6, x, 1.1, z, "#141414");
  b.cyl("lit", 0.16, 0.11, 0.38, 4, x, 2.35, z, [3, 2, 1.1], { uv: WIN.white, ry: Math.PI / 4 });
  b.cyl("iron", 0.03, 0.24, 0.18, 4, x, 2.62, z, "#141414", { ry: Math.PI / 4 });
  b.plane("glow", 3.5, 3.5, x, 0.03, z, [0.3, 0.19, 0.09], { rx: -Math.PI / 2 });
}

/** Tall iron railing along local x, bars with gilded spear tips. */
function railing(b: Batch, x0: number, x1: number, z: number) {
  b.box("iron", x1 - x0, 0.06, 0.06, (x0 + x1) / 2, 0.25, z, "#141414");
  b.box("iron", x1 - x0, 0.06, 0.06, (x0 + x1) / 2, 2.2, z, "#141414");
  for (let x = x0 + 0.08; x < x1; x += 0.16) {
    b.cyl("iron", 0.018, 0.018, 2.4, 4, x, 1.2, z, "#141414");
    b.cyl("paint", 0, 0.04, 0.16, 4, x, 2.48, z, GILT);
  }
}

/** Gardens between KNAK and its neighbours (x ±10.4 .. ±16): lawn, clipped hedges, lit topiaries, railings, a lantern-lit lane. */
export function cafeGrounds(b: Batch) {
  for (const s of [-1, 1]) {
    const xi = s * 10.4, xo = s * 16;
    const [a, c] = [Math.min(xi, xo), Math.max(xi, xo)];
    const lane = s * 13.4;
    b.plane("foliage", c - a, 21, (a + c) / 2, 0.005, -10.3, [0.035, 0.07, 0.025], { rx: -Math.PI / 2, jitter: 0.15 });
    b.plane("road", 1.8, 21.2, lane, 0.012, -10.2, "#8a8274", { rx: -Math.PI / 2 });
    hedge(b, a + (s > 0 ? 0 : 4.6), a + (s > 0 ? 1.0 : 5.6), -20.5, -1.2, 1.3);
    hedge(b, s > 0 ? c - 1.2 : a, s > 0 ? c : a + 1.2, -20.5, -0.8, 2.4);
    for (const z of [-3.5, -9.5, -15.5]) {
      topiary(b, lane - s * 1.25, z, z !== -9.5);
      topiary(b, lane + s * 1.25, z - 1.5, z === -9.5);
    }
    for (let z = -2; z > -20; z -= 6) lantern(b, lane + (z % 12 === -2 ? 1 : -1) * s * 1.05, z);
    // garden wall closing the far end
    b.box("paint", c - a, 3.0, 0.4, (a + c) / 2, 1.5, -20.9, "#e2d6bf");
    // street railing with stone gate piers and urns
    railing(b, a + 0.3, lane - 1.45, 0.3);
    railing(b, lane + 1.45, c - 0.3, 0.3);
    for (const px of [a, lane - 1.15, lane + 1.15, c]) {
      b.box("paint", 0.6, 2.8, 0.6, px, 1.4, 0.3, STONE);
      b.box("paint", 0.72, 0.14, 0.72, px, 2.87, 0.3, "#e2d6bf");
      b.geo("paint", urn(), px, 2.94, 0.3, LIT_STONE);
    }
    // the gate itself, closed
    railing(b, lane - 0.85, lane + 0.85, 0.3);
    b.plane("glow", 3, 3, lane, 0.02, 1.4, [0.25, 0.16, 0.08], { rx: -Math.PI / 2 });
  }
}

/** Red carpet from the kerb to the door, flanked by brass stanchions and velvet ropes. */
export function redCarpet(b: Batch) {
  b.box("paint", 2.2, 0.014, 5.6, 0, 0.007, 3.0, "#6e0f18");
  b.box("paint", 2.3, 0.016, 0.06, 0, 0.008, 5.8, GILT);
  const zs = [0.9, 2.5, 4.1, 5.6];
  for (const s of [-1, 1]) {
    const x = s * 1.5;
    for (const z of zs) {
      b.cyl("iron", 0.16, 0.18, 0.04, 12, x, 0.02, z, "#c79c45");
      b.cyl("iron", 0.03, 0.03, 0.95, 8, x, 0.5, z, "#c79c45");
      b.geo("iron", canopy(1, 1), x, 1.0, z, "#c79c45", { s: [0.06, 0.06, 0.06] });
    }
    for (let i = 0; i < zs.length - 1; i++) b.cyl("paint", 0.025, 0.025, zs[i + 1] - zs[i], 6, x, 0.86, (zs[i] + zs[i + 1]) / 2, "#5c1520", { rx: Math.PI / 2 });
  }
}
