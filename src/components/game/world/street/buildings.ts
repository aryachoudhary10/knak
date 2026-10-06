import * as THREE from "three";
import { Batch, canopy, prism } from "./kit";
import { ATLAS, DARK_WINDOWS, LIT_WINDOWS, WIN, signUv, type SignKey, type UvRect } from "./textures";

/** Haussmann apartment buildings, generated into a Batch in a local frame: facade on z = 0 facing +z, x from 0 to w. */

export type Shop = "boulangerie" | "fleuriste" | "closed" | "fromagerie" | "librairie" | "pharmacie" | "tabac" | "cave" | "mercerie" | "charcuterie" | "antiques" | "cafe";

export type Rnd = () => number;
export function rng(seed: number): Rnd {
  let s = Math.floor(seed * 9301 + 49297) % 233280 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const TINTS = ["#e6dcc6", "#ddd0b6", "#e9e0cc", "#d6c7aa", "#e2d5bb", "#d9ccb2", "#e4d8c0"];
const shade = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);

export type BuildingSpec = {
  w: number;
  depth: number;
  ground: number;
  floorHs: number[];
  /** French floor number of the first floor above the base (1 normally, 2 above the café). */
  firstFloorNo: number;
  startY: number;
  noGround?: boolean;
  shops: Shop[];
  lod: 0 | 1;
  seed: number;
  tint?: string;
};

type ShopStyle = { frame: string; sign: SignKey; glass: UvRect | null; lit: number; pool?: boolean };
const SHOP: Record<Shop, ShopStyle> = {
  boulangerie: { frame: "#1f3550", sign: "boulangerie", glass: WIN.bakery, lit: 1.25, pool: true },
  fleuriste: { frame: "#24402c", sign: "fleuriste", glass: WIN.florist, lit: 1.1, pool: true },
  closed: { frame: "#5a1e22", sign: "quincaillerie", glass: null, lit: 0 },
  fromagerie: { frame: "#c9bc98", sign: "fromagerie", glass: WIN.bakery, lit: 0.9, pool: true },
  librairie: { frame: "#2a2a2e", sign: "librairie", glass: WIN.books, lit: 0.95, pool: true },
  pharmacie: { frame: "#1d5a3a", sign: "pharmacie", glass: WIN.lamp, lit: 0.9 },
  tabac: { frame: "#8c1d1d", sign: "tabac", glass: WIN.books, lit: 0.9 },
  cave: { frame: "#3a1a26", sign: "cave", glass: WIN.cafe, lit: 0.7 },
  mercerie: { frame: "#3d4f6b", sign: "mercerie", glass: null, lit: 0 },
  charcuterie: { frame: "#6b2a1a", sign: "charcuterie", glass: WIN.bakery, lit: 0.85 },
  antiques: { frame: "#1c1c1c", sign: "antiques", glass: WIN.darkGlass, lit: 0 },
  cafe: { frame: "#5c1520", sign: "cafe", glass: WIN.cafe, lit: 1.3, pool: true },
};

const pick = <T,>(r: Rnd, a: readonly T[]) => a[Math.floor(r() * a.length) % a.length];

function windowPane(b: Batch, r: Rnd, w: number, h: number, x: number, y: number, z: number, litChance = 0.42) {
  if (r() < litChance) {
    const k = 0.55 + r() * 0.65 + (r() < 0.06 ? 0.6 : 0);
    b.plane("lit", w, h, x, y, z, [k, k * 0.92, k * 0.85], { uv: pick(r, LIT_WINDOWS) });
  } else {
    const k = 0.7 + r() * 0.3;
    b.plane("dark", w, h, x, y, z, [k, k, k], { uv: pick(r, DARK_WINDOWS) });
  }
}

function railing(b: Batch, len: number, h: number, x: number, y: number, z: number, ry = 0) {
  b.plane("rail", len, h, x, y, z, "#ffffff", { uvScale: [Math.max(1, Math.round(len)), 1], ry });
}

function shopfront(b: Batch, r: Rnd, kind: Shop, x0: number, x1: number, G: number, lod: 0 | 1) {
  const s = SHOP[kind];
  const u = x1 - x0;
  const xc = (x0 + x1) / 2;
  const frame = new THREE.Color(s.frame);
  const glassTop = G - 1.4;
  const glassBot = 0.62;
  // pilasters, fascia and stall riser of the painted wooden shopfront
  b.box("paint", 0.32, G - 0.55, 0.2, x0 + 0.16, (G - 0.55) / 2, 0.1, frame);
  b.box("paint", 0.32, G - 0.55, 0.2, x1 - 0.16, (G - 0.55) / 2, 0.1, frame);
  b.box("paint", u, 0.82, 0.24, xc, G - 0.97, 0.12, frame);
  b.box("paint", u - 0.6, 0.6, 0.16, xc, 0.3, 0.08, shade(frame, 0.8));
  b.box("paint", u + 0.1, 0.08, 0.3, xc, G - 0.54, 0.15, shade(frame, 0.7));
  // painted sign
  b.plane("atlas", Math.min(u - 0.5, 5.2), Math.min(0.62, (u - 0.5) / 8 + 0.1), xc, G - 0.97, 0.245, "#ffffff", { uv: signUv(s.sign) });
  if (kind === "closed" || kind === "mercerie") {
    // rideau métallique pulled down over the window and door
    b.plane("atlas", u - 0.64, glassTop - 0.02, xc, glassTop / 2 + 0.01, 0.07, "#d8d8d8", { uv: ATLAS.shutter, uvScale: [1, 1] });
    b.box("paint", u - 0.6, 0.3, 0.2, xc, glassTop + 0.1, 0.12, "#4a4b4b");
    return;
  }
  if (s.glass && s.lit > 0) {
    const k = s.lit;
    b.plane("lit", u - 0.64, glassTop - glassBot, xc, (glassTop + glassBot) / 2, 0.05, [k, k * 0.9, k * 0.8], { uv: s.glass });
    if (s.pool) b.plane("glow", u + 1.5, 3.2, xc, 0.02, 1.4, [0.28 * k, 0.18 * k, 0.09 * k], { rx: -Math.PI / 2 });
  } else {
    b.plane("dark", u - 0.64, glassTop - glassBot, xc, (glassTop + glassBot) / 2, 0.05, "#b0b0b0", { uv: s.glass ?? WIN.darkGlass });
  }
  // transom glazing above the door
  b.plane(s.lit > 0 ? "lit" : "dark", u - 0.64, 0.55, xc, glassTop + 0.35, 0.05, s.lit > 0 ? [0.6, 0.5, 0.35] : "#808080", { uv: s.lit > 0 ? WIN.sheer : WIN.darkGlass });
  if (lod === 0) {
    const n = Math.max(1, Math.round((u - 0.6) / 1.6));
    for (let i = 1; i < n; i++) b.box("paint", 0.08, glassTop - glassBot + 0.7, 0.12, x0 + 0.32 + (i * (u - 0.64)) / n, (glassTop + glassBot + 0.7) / 2, 0.08, frame);
    b.box("paint", u - 0.6, 0.07, 0.12, xc, glassTop + 0.04, 0.08, frame);
  }
  if (kind === "pharmacie") {
    // the green neon cross, hung out from the wall
    b.box("paint", 0.06, 0.06, 0.9, x1 - 0.5, G + 0.6, 0.45, "#222");
    b.box("lit", 0.7, 0.22, 0.08, x1 - 0.5, G + 0.6, 0.95, [0.2, 2.2, 0.6], { uv: WIN.white });
    b.box("lit", 0.22, 0.7, 0.08, x1 - 0.5, G + 0.6, 0.95, [0.2, 2.2, 0.6], { uv: WIN.white });
  }
  if (kind === "tabac") {
    // the red "carotte" lozenge
    b.box("paint", 0.06, 0.06, 0.6, x0 + 0.5, G + 0.4, 0.3, "#222");
    b.box("lit", 0.32, 0.8, 0.32, x0 + 0.5, G + 0.4, 0.62, [1.8, 0.25, 0.15], { uv: WIN.white, ry: Math.PI / 4 });
  }
  if (kind === "cafe") cafeTerrace(b, r, x0, x1, G);
  if (kind === "fleuriste") flowerStall(b, r, x0 + 0.4, x1 - 0.4, 0.55);
}

/** A striped awning over the café's windows and a terrace of bistro chairs on the pavement. */
function cafeTerrace(b: Batch, r: Rnd, x0: number, x1: number, G: number) {
  const u = x1 - x0 - 0.2;
  const xc = (x0 + x1) / 2;
  const depth = 2.6;
  const drop = 0.75;
  const ang = Math.atan2(drop, depth);
  const slope = Math.hypot(depth, drop);
  b.plane("atlas", u, slope, xc, G - 0.6 - drop / 2, depth / 2, "#ffffff", { uv: ATLAS.awning, rx: -Math.PI / 2 + ang });
  b.plane("atlas", u, slope, xc, G - 0.6 - drop / 2 - 0.01, depth / 2, "#808080", { uv: ATLAS.awning, rx: Math.PI / 2 + ang });
  b.plane("atlas", u, 0.32, xc, G - 0.6 - drop - 0.16, depth, "#ffffff", { uv: ATLAS.awningText });
  for (const sx of [-1, 1]) b.plane("atlas", depth, 0.32, xc + (sx * u) / 2, G - 0.6 - drop - 0.16, depth / 2, "#ffffff", { uv: ATLAS.awningText, ry: (sx * Math.PI) / 2 });
  // café light spilling onto the terrace
  b.plane("glow", u + 2, 5, xc, 0.02, 2.2, [0.32, 0.2, 0.1], { rx: -Math.PI / 2 });
  // bistro tables with pairs of chairs facing the street
  const n = Math.floor(u / 1.6);
  for (let i = 0; i < n; i++) {
    const tx = x0 + 0.9 + i * 1.6 + (r() - 0.5) * 0.2;
    const tz = 1.2 + (i % 2) * 0.35;
    b.cyl("iron", 0.3, 0.3, 0.03, 12, tx, 0.72, tz, "#c9c2b4");
    b.cyl("iron", 0.02, 0.02, 0.7, 5, tx, 0.36, tz, "#1a1a1a");
    b.cyl("iron", 0.2, 0.2, 0.02, 8, tx, 0.01, tz, "#1a1a1a");
    for (const side of [-1, 1]) bistroChair(b, tx + side * 0.48, tz + 0.25, -side * 0.4);
  }
}

export function bistroChair(b: Batch, x: number, z: number, rot: number) {
  b.at(x, 0, z, rot, () => {
    const cane = "#b98a4e";
    b.box("paint", 0.42, 0.06, 0.42, 0, 0.46, 0, cane);
    b.box("paint", 0.42, 0.42, 0.05, 0, 0.7, -0.2, "#7a1622", { rx: -0.12 });
    b.box("paint", 0.44, 0.04, 0.06, 0, 0.92, -0.23, cane);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.box("paint", 0.035, 0.46, 0.035, lx, 0.23, lz, cane);
  });
}

function porteCochere(b: Batch, xc: number, G: number, stone: THREE.Color, lod: 0 | 1, r: Rnd) {
  const dw = 2.3, dh = Math.min(3.6, G - 0.4);
  const wood = new THREE.Color(pick(r, ["#1f3a2c", "#24324a", "#3a2418", "#2a2a2a"]));
  b.box("paint", dw, dh, 0.08, xc, dh / 2, 0.0, wood);
  b.box("paint", 0.34, dh + 0.3, 0.18, xc - dw / 2 - 0.17, (dh + 0.3) / 2, 0.09, shade(stone, 0.92));
  b.box("paint", 0.34, dh + 0.3, 0.18, xc + dw / 2 + 0.17, (dh + 0.3) / 2, 0.09, shade(stone, 0.92));
  b.box("paint", dw + 0.9, 0.42, 0.22, xc, dh + 0.2, 0.11, shade(stone, 0.95));
  b.box("paint", 0.36, 0.5, 0.28, xc, dh + 0.24, 0.14, stone);
  if (lod === 0) {
    b.box("paint", 0.05, dh - 0.2, 0.12, xc, dh / 2, 0.04, shade(wood, 0.6));
    for (const sx of [-1, 1]) {
      b.box("paint", dw / 2 - 0.35, dh * 0.4, 0.1, xc + sx * dw * 0.25, dh * 0.62, 0.04, shade(wood, 1.25));
      b.box("paint", dw / 2 - 0.35, dh * 0.28, 0.1, xc + sx * dw * 0.25, dh * 0.2, 0.04, shade(wood, 1.25));
    }
    b.box("paint", 0.12, 0.03, 0.06, xc + 0.3, dh * 0.5, 0.1, "#b8923f");
  }
}

export function building(b: Batch, spec: BuildingSpec) {
  const r = rng(spec.seed);
  const { w, depth: D, lod } = spec;
  const stone = new THREE.Color(spec.tint ?? pick(r, TINTS));
  const dark = shade(stone, 0.86);
  const G = spec.noGround ? 0 : spec.ground;
  const base = spec.startY + G;
  const Htop = base + spec.floorHs.reduce((a, c) => a + c, 0);
  const bays = Math.max(3, Math.round(w / 2.9));
  const bw = w / bays;
  const ww = Math.min(1.25, bw * 0.46);

  // body
  b.box("paint", w, Htop - spec.startY, D, w / 2, (Htop + spec.startY) / 2, -D / 2, stone);

  // ground floor: plinth, rustication, shops and the carriage door
  if (!spec.noGround) {
    b.box("paint", w, 0.4, 0.1, w / 2, 0.2, 0.05, shade(stone, 0.78));
    if (lod === 0) for (let y = 0.85; y < G - 0.5; y += 0.45) b.box("paint", w, 0.04, 0.03, w / 2, y, 0.01, shade(stone, 0.7));
    b.box("paint", w, 0.32, 0.36, w / 2, G - 0.1, 0.16, dark);
    const cafe = spec.shops[0] === "cafe";
    const doorBay = bays >= 4 && !cafe ? Math.floor(r() * bays) : -1;
    const groups: [number, number][] = [];
    let start = -1;
    for (let i = 0; i <= bays; i++) {
      const isGap = i === bays || i === doorBay;
      if (!isGap && start < 0) start = i;
      if (isGap && start >= 0) {
        groups.push([start, i]);
        start = -1;
      }
    }
    if (doorBay >= 0) porteCochere(b, (doorBay + 0.5) * bw, G - 0.25, stone, lod, r);
    let si = 0;
    for (const [a, c] of groups) {
      // split long runs into two shops
      const runs: [number, number][] = c - a >= 4 && !cafe ? [[a, a + Math.floor((c - a) / 2)], [a + Math.floor((c - a) / 2), c]] : [[a, c]];
      for (const [p, q] of runs) {
        const kind = spec.shops[si++] ?? pick(r, ["fromagerie", "librairie", "cave", "mercerie", "charcuterie", "antiques", "tabac", "closed"] as Shop[]);
        shopfront(b, r, kind, p * bw + 0.25, q * bw - 0.25, G - 0.25, lod);
      }
    }
  }

  // upper floors
  let yb = base;
  spec.floorHs.forEach((fh, i) => {
    const no = spec.firstFloorNo + i;
    const grand = no === 2 || no === 5;
    const wh = fh * (no <= 2 ? 0.74 : no >= 5 ? 0.66 : 0.7);
    const yw = yb + 0.12 + wh / 2;
    if (grand) {
      // continuous wrought-iron balcony on stone consoles
      b.box("paint", w - 0.1, 0.18, 0.9, w / 2, yb - 0.02, 0.44, dark);
      if (lod === 0) for (let k = 0; k <= bays; k++) b.box("paint", 0.22, 0.42, 0.6, Math.min(w - 0.2, Math.max(0.2, k * bw)), yb - 0.32, 0.3, shade(stone, 0.9));
      railing(b, w - 0.2, 1.0, w / 2, yb + 0.58, 0.86);
      b.box("iron", w - 0.2, 0.05, 0.08, w / 2, yb + 1.08, 0.86, "#181818");
      if (lod === 0) for (const x of [0.1, w - 0.1]) railing(b, 0.8, 1.0, x, yb + 0.58, 0.46, Math.PI / 2);
    } else {
      b.box("paint", w, 0.14, 0.12, w / 2, yb + 0.02, 0.06, dark);
    }
    for (let k = 0; k < bays; k++) {
      const x = (k + 0.5) * bw;
      windowPane(b, r, ww, wh, x, yw, 0.01);
      if (lod === 0) {
        b.box("paint", 0.16, wh + 0.12, 0.09, x - ww / 2 - 0.08, yw, 0.045, shade(stone, 1.03));
        b.box("paint", 0.16, wh + 0.12, 0.09, x + ww / 2 + 0.08, yw, 0.045, shade(stone, 1.03));
        b.box("paint", ww + 0.46, 0.2, 0.16, x, yw + wh / 2 + 0.14, 0.08, shade(stone, 0.96));
        if (no === 2) {
          b.box("paint", ww + 0.7, 0.1, 0.3, x, yw + wh / 2 + 0.34, 0.15, dark);
          b.box("paint", 0.26, 0.3, 0.2, x, yw + wh / 2 + 0.16, 0.12, stone);
        }
        if (!grand) {
          b.box("paint", ww + 0.3, 0.08, 0.26, x, yb + 0.1, 0.13, dark);
          railing(b, ww + 0.16, 0.85, x, yb + 0.56, 0.24);
        }
      } else if (!grand) {
        railing(b, ww + 0.16, 0.85, x, yb + 0.56, 0.2);
      }
    }
    yb += fh;
  });

  // main cornice
  b.box("paint", w, 0.2, 0.3, w / 2, Htop - 0.12, 0.13, dark);
  b.box("paint", w, 0.38, 0.8, w / 2, Htop + 0.15, 0.25, shade(stone, 0.95));

  // zinc mansard
  const y0 = Htop + 0.34;
  const zincTint = new THREE.Color().setRGB(0.92 + r() * 0.1, 0.95 + r() * 0.08, 1);
  const prof: [number, number][] = [[-D + 0.3, y0], [-0.2, y0], [-1.3, y0 + 3.0], [-D / 2, y0 + 3.9], [-D + 1.4, y0 + 3.0]];
  b.geo("zinc", prism(prof, w), 0, 0, 0, zincTint, { uvScale: [1, 1] });

  // dormers in each bay (or alternate bays on wide buildings)
  for (let k = 0; k < bays; k++) {
    if (bays > 5 && k % 2 === 1 && r() < 0.5) continue;
    const x = (k + 0.5) * bw;
    const dh = 1.6;
    b.box("paint", 1.2, dh, 1.5, x, y0 + 0.4 + dh / 2, -1.0, shade(stone, 0.97));
    b.cyl("zinc", 0.66, 0.66, 1.62, 10, x, y0 + 0.4 + dh, -1.0, zincTint, { rx: Math.PI / 2 });
    windowPane(b, r, 0.72, 1.15, x, y0 + 0.4 + dh / 2 - 0.05, -0.24, 0.35);
  }

  // chimney stacks on the party walls, with clay pots
  const chim = new THREE.Color(pick(r, ["#b9a184", "#c4ae8f", "#a8917a", "#b38c6c"]));
  for (const cx of r() < 0.5 ? [w] : [0, w]) {
    const ch = 1.6 + r() * 1.2;
    const len = 2.6 + r() * 1.6;
    const cz = -D / 2 + (r() - 0.5) * 1.5;
    b.box("paint", 0.7, ch + 1.4, len, cx, y0 + 3.9 - 1.4 + (ch + 1.4) / 2, cz, chim);
    b.box("paint", 0.82, 0.16, len + 0.12, cx, y0 + 3.9 + ch, cz, shade(chim, 0.85));
    const pots = Math.floor(len / 0.45);
    for (let p = 0; p < pots; p++) b.cyl("paint", 0.09, 0.12, 0.45 + r() * 0.15, 6, cx + (r() - 0.5) * 0.2, y0 + 3.9 + ch + 0.3, cz - len / 2 + 0.25 + p * 0.45, "#9a4f34");
  }
  if (w > 12) {
    const ch = 1.2 + r() * 0.8;
    b.box("paint", 0.6, ch + 1, 1.2, w * (0.35 + r() * 0.3), y0 + 3.4 + ch / 2, -D / 2 - 1.2, chim);
  }
  return Htop;
}

export type Row = { origin: THREE.Vector3; normal: THREE.Vector3; length: number; seed: number; depth?: number };

/** Lay buildings of varied width and height along a frontage. shopsFor gets the building's world centre. */
export function row(b: Batch, rowDef: Row, shopsFor: (c: THREE.Vector3, w: number) => Shop[] | undefined, lodFor: (c: THREE.Vector3) => 0 | 1) {
  const r = rng(rowDef.seed);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3().crossVectors(up, rowDef.normal).normalize();
  const basis = new THREE.Matrix4().makeBasis(dir, up, rowDef.normal);
  let s = 0;
  let i = 0;
  while (s < rowDef.length - 0.5) {
    let w = 11 + r() * 6;
    if (rowDef.length - s - w < 8) w = rowDef.length - s;
    const p = rowDef.origin.clone().addScaledVector(dir, s);
    const centre = p.clone().addScaledVector(dir, w / 2);
    const m = basis.clone().setPosition(p);
    const scale = 0.95 + r() * 0.1;
    const extra = r();
    const floorHs = (extra < 0.15 ? [3.0, 3.2, 2.9, 2.8] : extra > 0.88 ? [3.1, 3.3, 3.0, 2.9, 2.8, 2.7] : [3.1, 3.3, 3.0, 2.9, 2.8]).map((h) => h * scale);
    const spec: BuildingSpec = {
      w,
      depth: rowDef.depth ?? 12,
      ground: 4.1 + r() * 0.4,
      floorHs,
      firstFloorNo: 1,
      startY: 0,
      shops: shopsFor(centre, w) ?? [],
      lod: lodFor(centre),
      seed: rowDef.seed * 100 + i * 7 + 1,
    };
    b.push(m, () => building(b, spec));
    s += w;
    i++;
  }
}

/** Buckets of flowers on the pavement outside the fleuriste. */
export function flowerStall(b: Batch, r: Rnd, x0: number, x1: number, z: number) {
  const blooms = ["#d8324a", "#f2c23a", "#f4eef2", "#b34aa0", "#ef7d3c", "#e895b0"];
  for (let x = x0; x < x1; x += 0.42) {
    for (let row = 0; row < 2; row++) {
      const bx = x + row * 0.2, bz = z + row * 0.42;
      b.cyl("iron", 0.17, 0.13, 0.36 + row * 0.12, 8, bx, 0.18 + row * 0.06, bz, "#3a4a52");
      const c = new THREE.Color(blooms[Math.floor(r() * blooms.length)]).multiplyScalar(0.9);
      b.geo("foliage", canopy(Math.floor(r() * 4)), bx, 0.55 + row * 0.12, bz, c, { s: [0.22, 0.18, 0.22] });
    }
  }
}
