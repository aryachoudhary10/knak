import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function veins(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, count: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    ctx.globalAlpha = 0.15 + rnd() * 0.25;
    ctx.beginPath();
    let x = rnd() * w;
    let y = rnd() * h;
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (rnd() - 0.4) * w * 0.18;
      y += (rnd() - 0.5) * h * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- noise helpers for natural-looking stone and wood ----------
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  /** Periodic 2D gradient noise (period in lattice cells), so textures tile seamlessly. */
  return (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X0 = ((xi % period) + period) % period, Y0 = ((yi % period) + period) % period;
    const X1 = (X0 + 1) % period, Y1 = (Y0 + 1) % period;
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X0] + Y0], ab = perm[perm[X0] + Y1], ba = perm[perm[X1] + Y0], bb = perm[perm[X1] + Y1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return x1 + v * (x2 - x1);
  };
}

function fbm(n: ReturnType<typeof makeNoise>, x: number, y: number, period: number, octaves = 5) {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * n(x * f, y * f, period * f);
    amp *= 0.5;
    f *= 2;
  }
  return sum;
}

function pixelTexture(key: string, w: number, h: number, shade: (x: number, y: number) => [number, number, number]) {
  return canvasTexture(key, w, h, (ctx) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b] = shade(x, y);
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Polished Carrara (white) and Nero Marquina (black) marble checkerboard; one repeat = 2 x 2 tiles. */
export function checkerTexture() {
  const size = 1024;
  const tile = size / 2;
  const nA = makeNoise(11);
  const nB = makeNoise(29);
  const tex = pixelTexture("checker", size, size, (x, y) => {
    const ti = Math.floor(x / tile), tj = Math.floor(y / tile);
    const dark = (ti + tj) % 2 === 1;
    const u = (x / size) * 8, v = (y / size) * 8;
    const n = dark ? nB : nA;
    const turb = fbm(n, u + ti * 3.1, v + tj * 1.7, 64, 6);
    const vein = Math.abs(Math.sin((u * 0.9 + v * 0.6) * 2.2 + turb * 7));
    const fine = Math.pow(1 - vein, dark ? 18 : 10);
    const cloud = fbm(n, u * 0.6 + 7, v * 0.6, 64, 4) * 0.5 + 0.5;
    let r: number, g: number, b: number;
    if (dark) {
      const base = mix(14, 30, cloud);
      r = mix(base, 225, fine * 0.85); g = mix(base, 222, fine * 0.85); b = mix(base + 2, 215, fine * 0.85);
    } else {
      const base = mix(226, 244, cloud);
      r = mix(base, 150, fine * 0.55); g = mix(base - 3, 148, fine * 0.55); b = mix(base - 8, 146, fine * 0.55);
    }
    // thin grout line at tile edges
    const gx = x % tile, gy = y % tile;
    if (gx < 2 || gy < 2 || gx > tile - 3 || gy > tile - 3) { r *= 0.55; g *= 0.53; b *= 0.5; }
    return [r, g, b];
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function marbleTexture() {
  const n = makeNoise(5);
  const tex = pixelTexture("marble", 512, 512, (x, y) => {
    const u = (x / 512) * 6, v = (y / 512) * 6;
    const turb = fbm(n, u, v, 48, 6);
    const vein = Math.pow(1 - Math.abs(Math.sin((u + v * 0.4) * 2 + turb * 6)), 12);
    const base = mix(232, 246, fbm(n, u * 0.5 + 3, v * 0.5, 48, 3) * 0.5 + 0.5);
    return [mix(base, 160, vein * 0.5), mix(base - 2, 156, vein * 0.5), mix(base - 6, 150, vein * 0.5)];
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Dark French-polished walnut grain. */
export function walnutTexture() {
  const n = makeNoise(17);
  const tex = pixelTexture("walnut", 512, 512, (x, y) => {
    const u = x / 512, v = y / 512;
    const warp = fbm(n, u * 4, v * 16, 64, 4);
    const ring = Math.sin((u * 40 + warp * 6) * Math.PI) * 0.5 + 0.5;
    const streak = fbm(n, u * 60, v * 3, 64, 3) * 0.5 + 0.5;
    const t = ring * 0.6 + streak * 0.4;
    return [mix(48, 92, t), mix(28, 56, t), mix(16, 32, t)];
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Tufted (Chesterfield) upholstery pattern as a bump map. */
export function tuftBumpTexture() {
  return pixelTexture("tuft", 256, 256, (x, y) => {
    const cx = 128, cy = 128;
    const dx = Math.abs(((x + 64) % 128) - 64), dy = Math.abs(((y + 64) % 128) - 64);
    const diamond = (dx + dy) / 64;
    const d1 = Math.hypot(((x) % 128) - 64, ((y) % 128) - 64) / 64;
    const pillow = Math.min(1, 1 - Math.abs(1 - diamond));
    const button = d1 < 0.08 || Math.hypot(x % 128, y % 128) < 9 ? 0 : 1;
    const val = 120 + pillow * 120 * button - (button ? 0 : 60);
    void cx; void cy;
    return [val, val, val];
  });
}

export function pavingTexture() {
  const tex = canvasTexture("paving", 512, 512, (ctx) => {
    ctx.fillStyle = "#d9d2c3";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(120,110,95,0.45)";
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      const off = (y / 128) % 2 ? 128 : 0;
      for (let x = off; x < 512 + 256; x += 256) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 128); ctx.stroke();
      }
    }
    veins(ctx, 512, 512, "#a59c8b", 25, 3);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Gold serif "KNAK" lettering for the facade frieze. */
export function signTexture() {
  return canvasTexture("sign", 1024, 256, (ctx) => {
    ctx.clearRect(0, 0, 1024, 256);
    const grad = ctx.createLinearGradient(0, 40, 0, 220);
    grad.addColorStop(0, "#f3d98b");
    grad.addColorStop(0.5, "#c9a24a");
    grad.addColorStop(1, "#8f6a24");
    ctx.fillStyle = grad;
    ctx.font = "600 190px 'Cormorant Garamond', 'Times New Roman', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(60,40,10,0.45)";
    ctx.shadowOffsetY = 6;
    ctx.shadowBlur = 8;
    // Letter-spaced like the real sign.
    const letters = "KNAK".split("");
    const spacing = 210;
    letters.forEach((l, i) => ctx.fillText(l, 512 + (i - 1.5) * spacing, 138));
  });
}

/** A backlit shelf of bottles for the wall behind the counter. */
export function bottlesTexture() {
  return canvasTexture("bottles", 1024, 512, (ctx) => {
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, "#3a2a18");
    bg.addColorStop(1, "#1d140c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 512);
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const colors = ["#5d7a3a", "#8c2a2a", "#c9a24a", "#2f5a6b", "#e9dcc0", "#6b3a1f", "#3d6b4f"];
    for (let shelf = 0; shelf < 3; shelf++) {
      const baseY = 150 + shelf * 160;
      const glow = ctx.createLinearGradient(0, baseY - 120, 0, baseY);
      glow.addColorStop(0, "rgba(255,200,120,0.05)");
      glow.addColorStop(1, "rgba(255,200,120,0.35)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, baseY - 130, 1024, 130);
      for (let x = 20; x < 1000; x += 26 + rnd() * 18) {
        const h = 60 + rnd() * 50;
        const w = 14 + rnd() * 8;
        ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, baseY - h, w, h);
        ctx.fillRect(x + w / 2 - 3, baseY - h - 22, 6, 22);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 2, baseY - h + 6, 3, h - 12);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#b8923f";
      ctx.fillRect(0, baseY, 1024, 8);
    }
  });
}

/** Dusk view through a window: warm horizon, a few trees. */
export function windowViewTexture() {
  return canvasTexture("window-view", 256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#2b3a5c");
    g.addColorStop(0.55, "#a77c6b");
    g.addColorStop(0.75, "#e8b07a");
    g.addColorStop(1, "#4a3a2a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "rgba(30,40,30,0.85)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(20 + i * 45, 400 + (i % 2) * 15, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Soft, warm "reflection" for wall mirrors; real reflections cost too much on phones. */
export function mirrorTexture() {
  return canvasTexture("mirror", 256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#d9c9a6");
    g.addColorStop(0.45, "#b9a582");
    g.addColorStop(0.62, "#6b5a45");
    g.addColorStop(1, "#3a2c20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    // blurred chandelier glows
    for (const [x, y, r] of [[80, 110, 60], [190, 150, 40], [130, 60, 30]] as const) {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, "rgba(255,236,190,0.95)");
      rg.addColorStop(1, "rgba(255,220,160,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, 256, 512);
    }
    // diagonal sheen
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(40, 0); ctx.lineTo(110, 0); ctx.lineTo(10, 512); ctx.lineTo(-60, 512);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** Woven cane (Vienna straw) with see-through gaps, for chair backs. */
export function caneTexture() {
  const tex = canvasTexture("cane", 256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.lineCap = "round";
    const strand = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.strokeStyle = "#b98d4f";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,235,190,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    for (let i = -256; i < 512; i += 21) {
      strand(i, 0, i + 256, 256);
      strand(i + 256, 0, i, 256);
    }
    for (let i = 0; i < 256; i += 21) {
      strand(i, 0, i, 256);
      strand(0, i, 256, i);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Normal map for the marble floor: recessed grout lines and faint surface undulation. 2 x 2 tiles per repeat. */
export function floorNormalTexture() {
  const size = 512;
  const tile = size / 2;
  const n = makeNoise(41);
  const height = (x: number, y: number) => {
    const gx = ((x % tile) + tile) % tile, gy = ((y % tile) + tile) % tile;
    const edge = Math.min(gx, gy, tile - gx, tile - gy);
    const groove = edge < 3 ? -1 + edge / 3 : 0;
    return groove + fbm(n, (x / size) * 8, (y / size) * 8, 64, 3) * 0.08;
  };
  const tex = pixelTexture("floor-normal", size, size, (x, y) => {
    const dx = height(x + 1, y) - height(x - 1, y);
    const dy = height(x, y + 1) - height(x, y - 1);
    const nx = -dx * 2, ny = -dy * 2, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    return [((nx / l) * 0.5 + 0.5) * 255, ((ny / l) * 0.5 + 0.5) * 255, ((nz / l) * 0.5 + 0.5) * 255];
  });
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
