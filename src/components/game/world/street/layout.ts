import * as THREE from "three";
import { Batch } from "./kit";
import { row, rng, type Shop } from "./buildings";
import { cafeCrown, cafeGrounds, redCarpet } from "./crown";
import { bench, car, ground, lamp, morrisColumn, SIDE, tree, vespa, wallaceFountain } from "./props";

/** The whole street, laid out once into merged geometry per material. */
const FAR_Z = 23;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildStreet(hq: boolean) {
  const b = new Batch();
  const r = rng(2024);
  const lodFor = (c: THREE.Vector3) => (Math.hypot(c.x, c.z - 8) > (hq ? 50 : 32) ? 1 : 0) as 0 | 1;

  // KNAK stands alone: its own crown, side gardens and a red carpet; no apartments above or behind.
  cafeCrown(b);
  cafeGrounds(b);
  redCarpet(b);

  // Café side of the street, continuing left and right.
  // Shops by distance of the building's nearest edge from the café.
  const nearShops = (c: THREE.Vector3, w: number): Shop[] | undefined => {
    const edge = Math.abs(c.x) - w / 2;
    if (edge < 17) return c.x < 0 ? ["boulangerie", "tabac"] : ["fleuriste", "pharmacie"];
    if (edge < 36) return c.x < 0 ? ["fromagerie", "closed"] : ["librairie", "cave"];
    return undefined;
  };
  row(b, { origin: v(-150, 0, 0), normal: v(0, 0, 1), length: 134, seed: 11 }, nearShops, lodFor);
  row(b, { origin: v(16, 0, 0), normal: v(0, 0, 1), length: 134, seed: 23 }, nearShops, lodFor);

  // Across the road, split by the side street that the opening shot flies down.
  const farShops = (c: THREE.Vector3, w: number): Shop[] | undefined => {
    const edge = c.x < 0 ? -c.x - w / 2 + SIDE.left : c.x - w / 2 - SIDE.right;
    if (edge < 1) return c.x > 0 ? ["cafe"] : ["closed", "librairie"];
    if (edge < 20) return c.x > 0 ? ["charcuterie", "mercerie"] : ["antiques", "tabac"];
    return undefined;
  };
  row(b, { origin: v(SIDE.left - 0.25, 0, FAR_Z), normal: v(0, 0, -1), length: 150 + SIDE.left - 0.25, seed: 37 }, farShops, lodFor);
  row(b, { origin: v(150, 0, FAR_Z), normal: v(0, 0, -1), length: 150 - SIDE.right - 0.25, seed: 41 }, farShops, lodFor);

  // The side street, receding into the haze; closed off far away by another frontage.
  const sideShops = (c: THREE.Vector3): Shop[] | undefined => (c.z < 40 ? (c.x < 0 ? ["antiques"] : ["tabac"]) : undefined);
  row(b, { origin: v(SIDE.left, 0, SIDE.end), normal: v(1, 0, 0), length: SIDE.end - SIDE.start - 0.2, seed: 53 }, sideShops, lodFor);
  row(b, { origin: v(SIDE.right, 0, SIDE.start + 0.2), normal: v(-1, 0, 0), length: SIDE.end - SIDE.start - 0.2, seed: 59 }, sideShops, lodFor);
  row(b, { origin: v(20, 0, SIDE.end), normal: v(0, 0, -1), length: 40, seed: 61 }, () => undefined, () => 1);

  ground(b);

  // Plane trees along both kerbs, with lamp posts in between.
  for (let k = 0; k < 10; k++) {
    for (const s of [-1, 1]) {
      tree(b, r, s * (13 + k * 9), 8.2, hq ? 2 : 1);
      if (k < 5) lamp(b, s * (17.5 + k * 18), 8.6, [0, -1.6]);
    }
  }
  for (let x = -94; x <= 100; x += 9) {
    if (x > SIDE.left - 3 && x < SIDE.right + 3) continue;
    tree(b, r, x + 1.5, 19.8, hq ? 2 : 1);
  }
  for (const x of [-12, -30, -48, -66, 10, 28, 46, 64]) lamp(b, x, 19.45, [0, 1.6]);
  for (let z = 30; z < 110; z += 20) {
    lamp(b, SIDE.left + 0.5, z, [1.2, 0]);
    lamp(b, SIDE.right - 0.5, z + 10, [-1.2, 0]);
  }

  // Street furniture.
  morrisColumn(b, -15.6, 6.4);
  wallaceFountain(b, 15.4, 7.2);
  bench(b, -24, 7.6, 0);
  bench(b, 24.5, 7.6, 0);
  bench(b, -19.5, 20.4, Math.PI);
  vespa(b, 11.4, 8.4, 0.5);
  car(b, -22, 17.95, -Math.PI / 2, "#2c4a6e");
  car(b, -16.6, 17.95, -Math.PI / 2, "#c9c4b8");
  car(b, 13.5, 17.95, -Math.PI / 2, "#7a1e22");
  car(b, 36, 10.05, Math.PI / 2, "#3a3a38");
  car(b, -40, 10.05, Math.PI / 2, "#a8b4b8");

  const tris = b.tris;
  return { parts: b.build(), tris };
}

