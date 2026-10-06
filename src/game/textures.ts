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

/** Black and white marble checkerboard, one texture repeat = 2 x 2 tiles. */
export function checkerTexture() {
  const tex = canvasTexture("checker", 512, 512, (ctx) => {
    const t = 256;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const dark = (i + j) % 2 === 1;
        ctx.fillStyle = dark ? "#1b1a1a" : "#ece6da";
        ctx.fillRect(i * t, j * t, t, t);
      }
    veins(ctx, 512, 512, "#9a9184", 40, 11);
    ctx.strokeStyle = "rgba(60,50,40,0.35)";
    ctx.lineWidth = 2;
    for (let k = 0; k <= 2; k++) {
      ctx.beginPath(); ctx.moveTo(k * t, 0); ctx.lineTo(k * t, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, k * t); ctx.lineTo(512, k * t); ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function marbleTexture() {
  return canvasTexture("marble", 256, 256, (ctx) => {
    ctx.fillStyle = "#f2eee6";
    ctx.fillRect(0, 0, 256, 256);
    veins(ctx, 256, 256, "#b5aea3", 18, 5);
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
