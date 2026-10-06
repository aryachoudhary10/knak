import * as THREE from "three";

const cache = new Map<string, THREE.BufferGeometry>();
function memo(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Stemmed wine glass, about 20 cm tall. */
export const wineGlassGeo = () =>
  memo("wineGlass", () =>
    new THREE.LatheGeometry(
      [v2(0, 0), v2(0.034, 0), v2(0.036, 0.004), v2(0.006, 0.01), v2(0.004, 0.09), v2(0.012, 0.1), v2(0.034, 0.13), v2(0.038, 0.165), v2(0.032, 0.2), v2(0.031, 0.2)],
      24,
    ),
  );

/** Charger plate with a raised rim. */
export const plateGeo = (r = 0.14) =>
  memo(`plate${r}`, () => new THREE.LatheGeometry([v2(0, 0.004), v2(r * 0.55, 0.004), v2(r * 0.7, 0.008), v2(r * 0.95, 0.014), v2(r, 0.016), v2(r * 0.98, 0.018), v2(r * 0.7, 0.012), v2(0, 0.01)], 32));

/** Round tablecloth draped to just above the floor, with soft folds around the hem. */
export const tableclothGeo = (r: number, top: number, drop: number) =>
  memo(`cloth${r}-${top}-${drop}`, () => {
    const pts = [v2(0, top + 0.012), v2(r - 0.03, top + 0.012), v2(r, top), v2(r + 0.012, top - 0.04)];
    for (let i = 1; i <= 8; i++) pts.push(v2(r + 0.012 + (i / 8) * 0.07, top - 0.04 - (i / 8) * drop));
    const g = new THREE.LatheGeometry(pts, 96);
    const pos = g.attributes.position;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      const fall = Math.max(0, (top - 0.04 - p.y) / drop);
      if (fall > 0) {
        const a = Math.atan2(p.z, p.x);
        const fold = 1 + Math.sin(a * 22) * 0.035 * fall + Math.sin(a * 9 + 1.3) * 0.02 * fall;
        p.x *= fold;
        p.z *= fold;
        pos.setXYZ(i, p.x, p.y, p.z);
      }
    }
    g.computeVertexNormals();
    return g;
  });

/** Square cloth for the banquette tables, falling a short way on all sides. */
export const squareClothGeo = (w: number, d: number, drop: number) =>
  memo(`sq${w}-${d}-${drop}`, () => {
    const g = new THREE.BoxGeometry(w + 0.06, drop, d + 0.06, 24, 4, 24);
    const pos = g.attributes.position;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      const fall = (drop / 2 - p.y) / drop;
      const along = Math.abs(p.x) > Math.abs(p.z) ? p.z : p.x;
      const k = 1 + Math.sin(along * 40) * 0.025 * fall;
      pos.setXYZ(i, p.x * k, p.y, p.z * k);
    }
    g.computeVertexNormals();
    return g;
  });

/** Curtain panel hanging in vertical folds that widen toward the floor. */
export const curtainGeo = (w: number, h: number) =>
  memo(`curtain${w}-${h}`, () => {
    const g = new THREE.PlaneGeometry(w, h, 48, 12);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = 0.5 - y / h; // 0 top .. 1 bottom
      const depth = 0.05 + 0.05 * t;
      pos.setZ(i, Math.sin((x / w) * Math.PI * 9) * depth);
    }
    g.computeVertexNormals();
    return g;
  });

/** A tube following a smooth curve through the given points. */
export function tubeGeo(key: string, points: [number, number, number][], radius: number, closed = false) {
  return memo(`tube-${key}`, () => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
    return new THREE.TubeGeometry(curve, 48, radius, 8, closed);
  });
}

/** Turned candle-holder / baluster shape. */
export const balusterGeo = () =>
  memo("baluster", () => new THREE.LatheGeometry([v2(0, 0), v2(0.05, 0), v2(0.05, 0.015), v2(0.02, 0.03), v2(0.012, 0.09), v2(0.025, 0.11), v2(0.02, 0.125), v2(0, 0.125)], 20));

/** Crystal drop (prism) for chandeliers. */
export const prismGeo = () => memo("prism", () => new THREE.OctahedronGeometry(0.022, 0).scale(0.7, 1.6, 0.7));
