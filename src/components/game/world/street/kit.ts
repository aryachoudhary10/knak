import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { UvRect } from "./textures";

/** One merged mesh per part, so the whole street is a handful of draw calls. */
export type Part = "paint" | "zinc" | "iron" | "rail" | "lit" | "dark" | "atlas" | "foliage" | "car" | "glow" | "paving" | "road";

type AddOpts = {
  /** Remap the geometry's 0..1 uvs into this atlas rectangle. */
  uv?: UvRect;
  /** Multiply uvs (for repeating textures). */
  uvScale?: [number, number];
  /** Random per-vertex brightness spread (0..1), for dappled foliage. */
  jitter?: number;
};

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);
const cylCache = new Map<string, THREE.BufferGeometry>();

/** Unit-height cylinder of given top/bottom radius ratio; scaled per use. */
function unitCyl(rTop: number, rBot: number, seg: number, open = false) {
  const k = `${rTop}|${rBot}|${seg}|${open}`;
  let g = cylCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rTop, rBot, 1, seg, 1, open);
    cylCache.set(k, g);
  }
  return g;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export class Batch {
  private parts = new Map<Part, THREE.BufferGeometry[]>();
  private frames: THREE.Matrix4[] = [new THREE.Matrix4()];
  private col = new THREE.Color();
  tris = 0;

  get frame() {
    return this.frames[this.frames.length - 1];
  }

  /** Run fn in a local frame (translation + yaw), nested on the current one. */
  push(m: THREE.Matrix4, fn: () => void) {
    this.frames.push(this.frame.clone().multiply(m));
    fn();
    this.frames.pop();
  }

  at(x: number, y: number, z: number, rotY: number, fn: () => void) {
    this.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1)), fn);
  }

  add(part: Part, src: THREE.BufferGeometry, local: THREE.Matrix4, color: THREE.ColorRepresentation | [number, number, number], opts: AddOpts = {}) {
    const g = src.clone();
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    g.applyMatrix4(tmpM.multiplyMatrices(this.frame, local));
    const n = g.attributes.position.count;
    if (Array.isArray(color)) this.col.setRGB(color[0], color[1], color[2]);
    else this.col.set(color);
    const c = new Float32Array(n * 3);
    const j = opts.jitter ?? 0;
    for (let i = 0; i < n; i++) {
      const f = j ? 1 - j + Math.random() * j * 2 : 1;
      c[i * 3] = this.col.r * f;
      c[i * 3 + 1] = this.col.g * f;
      c[i * 3 + 2] = this.col.b * f;
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    const uv = g.attributes.uv as THREE.BufferAttribute;
    if (opts.uv || opts.uvScale) {
      const [u0, v0, u1, v1] = opts.uv ?? [0, 0, 1, 1];
      const [su, sv] = opts.uvScale ?? [1, 1];
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * su * (u1 - u0), v0 + uv.getY(i) * sv * (v1 - v0));
    }
    this.tris += g.index!.count / 3;
    let list = this.parts.get(part);
    if (!list) this.parts.set(part, (list = []));
    list.push(g);
  }

  /** Axis-aligned (in the current frame) box centred at x, y, z, optionally yawed / pitched. */
  box(part: Part, w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number], opts: AddOpts & { ry?: number; rx?: number; rz?: number } = {}) {
    tmpE.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE), tmpS.set(w, h, d));
    this.add(part, unitBox, tmpM.clone(), color, opts);
  }

  /** Plane facing +z (in the current frame) unless rotated. */
  plane(part: Part, w: number, h: number, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number], opts: AddOpts & { ry?: number; rx?: number } = {}) {
    tmpE.set(opts.rx ?? 0, opts.ry ?? 0, 0);
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE), tmpS.set(w, h, 1));
    this.add(part, unitPlane, tmpM.clone(), color, opts);
  }

  cyl(part: Part, rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number], opts: AddOpts & { rx?: number; rz?: number; ry?: number; open?: boolean } = {}) {
    const r = Math.max(rTop, rBot, 1e-4);
    tmpE.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE), tmpS.set(r, h, r));
    this.add(part, unitCyl(+(rTop / r).toFixed(3), +(rBot / r).toFixed(3), seg, opts.open), tmpM.clone(), color, opts);
  }

  geo(part: Part, g: THREE.BufferGeometry, x: number, y: number, z: number, color: THREE.ColorRepresentation | [number, number, number], opts: AddOpts & { rx?: number; ry?: number; rz?: number; s?: [number, number, number] } = {}) {
    tmpE.set(opts.rx ?? 0, opts.ry ?? 0, opts.rz ?? 0);
    const s = opts.s ?? [1, 1, 1];
    tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE), tmpS.set(s[0], s[1], s[2]));
    this.add(part, g, tmpM.clone(), color, opts);
  }

  build() {
    const out = new Map<Part, THREE.BufferGeometry>();
    for (const [part, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out.set(part, merged);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return out;
  }
}

/** A prism: a closed (z, y) profile extruded along x from 0 to len. UV u runs along x in metres, v along the profile in metres. */
export function prism(profile: [number, number][], len: number) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  for (let i = 0; i < profile.length; i++) {
    const [z0, y0] = profile[i];
    const [z1, y1] = profile[(i + 1) % profile.length];
    const dz = z1 - z0, dy = y1 - y0;
    const L = Math.hypot(dz, dy);
    if (L < 1e-6) continue;
    // outward normal for a counter-clockwise profile in (z, y)
    const nz = dy / L, ny = -dz / L;
    const b = pos.length / 3;
    pos.push(0, y0, z0, len, y0, z0, len, y1, z1, 0, y1, z1);
    for (let k = 0; k < 4; k++) nrm.push(0, ny, nz);
    uv.push(0, run, len, run, len, run + L, 0, run + L);
    run += L;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  // end caps (fan; profile must be convex)
  for (const [x, sign] of [[0, -1], [len, 1]] as const) {
    const b = pos.length / 3;
    for (const [z, y] of profile) {
      pos.push(x, y, z);
      nrm.push(sign, 0, 0);
      uv.push(z, y);
    }
    for (let i = 1; i < profile.length - 1; i++) {
      if (sign > 0) idx.push(b, b + i + 1, b + i);
      else idx.push(b, b + i, b + i + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const canopyCache = new Map<number, THREE.BufferGeometry[]>();
/** Lumpy, smooth-shaded leaf mass (indexed so normals are shared). */
export function canopy(i: number, detail = 2) {
  let list = canopyCache.get(detail);
  if (!list) {
    canopyCache.set(detail, (list = []));
    for (let k = 0; k < 4; k++) {
      const raw = new THREE.IcosahedronGeometry(1, detail);
      raw.deleteAttribute("normal");
      raw.deleteAttribute("uv");
      const g = mergeVertices(raw);
      let seed = 31 + k * 977;
      const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const s = 0.82 + r() * 0.3;
        p.setXYZ(v, p.getX(v) * s, p.getY(v) * s, p.getZ(v) * s);
      }
      g.computeVertexNormals();
      g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2));
      list.push(g);
    }
  }
  return list[i % list.length];
}

