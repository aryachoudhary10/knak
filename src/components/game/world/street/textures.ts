import * as THREE from "three";

/** Procedural canvas textures for the street: window atlas, painted signs, ironwork, zinc and light pools. */

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export type UvRect = readonly [number, number, number, number];

// ---------------------------------------------------------------------------
// Window atlas: 1024 x 1024, 8 columns x 4 rows of 128 x 256 cells.
// Row 0: residential windows (lit and dark). Row 1: shop interiors (2 cells wide).
// Row 2: a flat white cell for lanterns and car lights.
// ---------------------------------------------------------------------------

const cell = (c: number, r: number, span = 1): UvRect => [c / 8, 1 - (r + 1) / 4, (c + span) / 8, 1 - r / 4];

export const WIN = {
  sheer: cell(0, 0),
  drapes: cell(1, 0),
  lamp: cell(2, 0),
  drawn: cell(3, 0),
  tv: cell(4, 0),
  darkGlass: cell(5, 0),
  shutters: cell(6, 0),
  darkNet: cell(7, 0),
  bakery: cell(0, 1, 2),
  florist: cell(2, 1, 2),
  cafe: cell(4, 1, 2),
  books: cell(6, 1, 2),
  white: [0.01, 0.26, 0.11, 0.49] as UvRect,
} as const;

export const LIT_WINDOWS = [WIN.sheer, WIN.drapes, WIN.lamp, WIN.drawn, WIN.sheer, WIN.drapes, WIN.tv];
export const DARK_WINDOWS = [WIN.darkGlass, WIN.darkGlass, WIN.shutters, WIN.darkNet];

function frenchFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = "#e9e2d2") {
  ctx.fillStyle = color;
  const t = 6;
  ctx.fillRect(x, y, w, t);
  ctx.fillRect(x, y + h - t, w, t);
  ctx.fillRect(x, y, t, h);
  ctx.fillRect(x + w - t, y, t, h);
  // transom
  ctx.fillRect(x, y + h * 0.2, w, 5);
  // two leaves meeting in the middle
  ctx.fillRect(x + w / 2 - 3, y + h * 0.2, 6, h * 0.8);
  // three panes per leaf
  for (let i = 1; i < 3; i++) ctx.fillRect(x, y + h * 0.2 + (h * 0.8 * i) / 3, w, 3);
  // low rail for the balconette
  ctx.fillRect(x, y + h * 0.86, w, 4);
}

function warmRoom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function windowAtlas() {
  return canvasTex("street-windows", 1024, 1024, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1024, 1024);
    const r = rng(41);
    const W = 128, H = 256;

    // 0: sheer curtains, warm
    warmRoom(ctx, 0, 0, W, H, "#ffd59a", "#c98a4a");
    ctx.fillStyle = "rgba(255,244,220,0.55)";
    for (let i = 0; i < 12; i++) ctx.fillRect(i * 11 + r() * 3, 40, 5, H - 40);
    // 1: drapes open, chandelier glow
    warmRoom(ctx, W, 0, W, H, "#ffcf8a", "#b06a34");
    ctx.fillStyle = "rgba(255,240,200,0.9)";
    ctx.beginPath();
    ctx.arc(W + 64, 70, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b1b22";
    ctx.fillRect(W + 4, 30, 26, H - 30);
    ctx.fillRect(W + W - 30, 30, 26, H - 30);
    ctx.fillStyle = "rgba(90,50,30,0.6)";
    ctx.fillRect(W + 40, 150, 50, 40);
    // 2: plain lit room with a lamp and bookshelf
    warmRoom(ctx, 2 * W, 0, W, H, "#f7c27e", "#a8632e");
    ctx.fillStyle = "rgba(70,40,20,0.75)";
    for (let i = 0; i < 4; i++) ctx.fillRect(2 * W + 70, 60 + i * 38, 50, 6);
    ctx.fillStyle = "rgba(255,236,190,0.95)";
    ctx.beginPath();
    ctx.arc(2 * W + 34, 150, 14, 0, Math.PI * 2);
    ctx.fill();
    // 3: heavy curtains nearly drawn, a slit of light
    warmRoom(ctx, 3 * W, 0, W, H, "#ffc77f", "#c07a3b");
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(3 * W, 30, 54, H);
    ctx.fillRect(3 * W + 74, 30, 54, H);
    // 4: cool TV light
    warmRoom(ctx, 4 * W, 0, W, H, "#9fb6e8", "#4a5a8a");
    ctx.fillStyle = "rgba(220,235,255,0.6)";
    ctx.fillRect(4 * W + 30, 140, 60, 40);
    // 5: dark glass reflecting the dusk sky
    warmRoom(ctx, 5 * W, 0, W, H, "#56688c", "#141821");
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(5 * W + 10, 0);
    ctx.lineTo(5 * W + 60, 0);
    ctx.lineTo(5 * W + 20, H);
    ctx.lineTo(5 * W - 30, H);
    ctx.fill();
    // 6: closed persiennes (folding iron shutters)
    ctx.fillStyle = "#8f8e86";
    ctx.fillRect(6 * W, 0, W, H);
    ctx.fillStyle = "#5b5a55";
    for (let y = 30; y < H; y += 9) ctx.fillRect(6 * W, y, W, 3);
    ctx.fillRect(6 * W + 62, 0, 4, H);
    // 7: dim net curtain, unlit
    warmRoom(ctx, 7 * W, 0, W, H, "#3a3a44", "#1a1a20");
    ctx.fillStyle = "rgba(200,200,210,0.18)";
    for (let i = 0; i < 12; i++) ctx.fillRect(7 * W + i * 11, 40, 5, H - 40);

    // frames on all residential cells except closed shutters
    for (let c = 0; c < 8; c++) if (c !== 6) frenchFrame(ctx, c * W, 0, W, H);

    // ---- Row 1: shop interiors (256 x 256)
    const S = 256;
    const y1 = 256;
    // bakery: warm shelves of bread
    warmRoom(ctx, 0, y1, S, S, "#ffe0a8", "#c98a42");
    for (let s = 0; s < 3; s++) {
      const by = y1 + 70 + s * 55;
      ctx.fillStyle = "#7a4a22";
      ctx.fillRect(10, by + 26, S - 20, 6);
      for (let x = 16; x < S - 30; x += 22 + r() * 8) {
        ctx.fillStyle = r() > 0.5 ? "#b8702a" : "#d89a48";
        ctx.beginPath();
        ctx.ellipse(x + 10, by + 16, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // baguettes in a basket
    ctx.fillStyle = "#c9873a";
    for (let i = 0; i < 9; i++) ctx.fillRect(170 + i * 8, y1 + 190 - (i % 3) * 6, 5, 60);
    // florist: dense colourful blooms
    warmRoom(ctx, S, y1, S, S, "#fbe6c0", "#9a7a50");
    const blooms = ["#e04a5a", "#f3c13a", "#f7f0f4", "#c85ab0", "#ef7d3c", "#e895b0", "#7a4ab0"];
    for (let i = 0; i < 260; i++) {
      const x = S + 10 + r() * (S - 20);
      const y = y1 + 90 + r() * 160;
      ctx.fillStyle = r() < 0.35 ? "#3d6a2e" : blooms[Math.floor(r() * blooms.length)];
      ctx.beginPath();
      ctx.arc(x, y, 4 + r() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // café: zinc bar, bottles, globe lamps
    warmRoom(ctx, 2 * S, y1, S, S, "#ffcf88", "#8a4a22");
    ctx.fillStyle = "#4a2a18";
    ctx.fillRect(2 * S, y1 + 170, S, 86);
    ctx.fillStyle = "#c7c3b8";
    ctx.fillRect(2 * S, y1 + 166, S, 8);
    for (let x = 2 * S + 8; x < 3 * S - 10; x += 11) {
      ctx.fillStyle = ["#5d7a3a", "#8c2a2a", "#c9a24a", "#e9dcc0"][Math.floor(r() * 4)];
      ctx.fillRect(x, y1 + 95 + r() * 8, 6, 30);
    }
    ctx.fillStyle = "rgba(255,246,220,1)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(2 * S + 50 + i * 78, y1 + 40, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(40,24,16,0.8)";
    for (let i = 0; i < 4; i++) {
      const x = 2 * S + 30 + i * 60 + r() * 15;
      ctx.beginPath();
      ctx.arc(x, y1 + 150, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 15, y1 + 162, 30, 60);
    }
    // bookshop
    warmRoom(ctx, 3 * S, y1, S, S, "#ffd697", "#a86a36");
    for (let s = 0; s < 4; s++) {
      const by = y1 + 40 + s * 50;
      for (let x = 3 * S + 8; x < 4 * S - 8; x += 7 + r() * 4) {
        ctx.fillStyle = ["#7a2a22", "#2a4a6a", "#d9c7a0", "#4a5a2a", "#9a6a2a"][Math.floor(r() * 5)];
        ctx.fillRect(x, by + r() * 6, 6, 38);
      }
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(3 * S, by + 42, S, 6);
    }
    // shop window mullions
    ctx.fillStyle = "#2a2a26";
    for (let c = 0; c < 4; c++) {
      ctx.fillRect(c * S, y1, S, 5);
      ctx.fillRect(c * S, y1 + S - 5, S, 5);
      ctx.fillRect(c * S, y1, 5, S);
      ctx.fillRect(c * S + S - 5, y1, 5, S);
      ctx.fillRect(c * S, y1 + 54, S, 4);
    }

    // ---- Row 2: flat white for lanterns
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 512, 128, 256);
  });
}

// ---------------------------------------------------------------------------
// Sign atlas: 1024 x 1024. Signs are 512 x 64 cells in two columns, ten rows (y 0..640).
// Below: metal shutter, awning stripes, Morris column posters.
// ---------------------------------------------------------------------------

type SignDef = { text: string; sub?: string; bg: string; fg: string; font?: string };

const SIGNS: SignDef[] = [
  { text: "BOULANGERIE", sub: "PÂTISSERIE", bg: "#1f3550", fg: "#e8c76a" },
  { text: "FLEURISTE", sub: "Les Jardins de Marie", bg: "#24402c", fg: "#f1e6c8" },
  { text: "QUINCAILLERIE", bg: "#5a1e22", fg: "#e6d3a8" },
  { text: "FROMAGERIE", bg: "#e9dfc6", fg: "#3a2a1a" },
  { text: "LIBRAIRIE", sub: "Livres anciens", bg: "#2a2a2e", fg: "#d9b25a" },
  { text: "PHARMACIE", bg: "#1d5a3a", fg: "#f4f4ee" },
  { text: "CAFÉ DES ARTS", bg: "#5c1520", fg: "#f0d590" },
  { text: "TABAC", sub: "PRESSE", bg: "#8c1d1d", fg: "#f4f0e6" },
  { text: "CAVE À VINS", bg: "#3a1a26", fg: "#e0c27a" },
  { text: "MERCERIE", bg: "#3d4f6b", fg: "#f2e8d5" },
  { text: "CHARCUTERIE", bg: "#6b2a1a", fg: "#f4e0b0" },
  { text: "ANTIQUITÉS", bg: "#1c1c1c", fg: "#c9a24a" },
  { text: "RUE DES LILAS", bg: "#1f3f8a", fg: "#ffffff" },
];

export type SignKey = "boulangerie" | "fleuriste" | "quincaillerie" | "fromagerie" | "librairie" | "pharmacie" | "cafe" | "tabac" | "cave" | "mercerie" | "charcuterie" | "antiques" | "plaque";
const SIGN_ORDER: SignKey[] = ["boulangerie", "fleuriste", "quincaillerie", "fromagerie", "librairie", "pharmacie", "cafe", "tabac", "cave", "mercerie", "charcuterie", "antiques", "plaque"];

export function signUv(key: SignKey): UvRect {
  const i = SIGN_ORDER.indexOf(key);
  const c = i % 2, r = Math.floor(i / 2);
  return [c / 2, 1 - ((r + 1) * 64) / 1024, (c + 1) / 2, 1 - (r * 64) / 1024];
}

/** Rectangles in pixels, converted to uv. */
const px = (x: number, y: number, w: number, h: number): UvRect => [x / 1024, 1 - (y + h) / 1024, (x + w) / 1024, 1 - y / 1024];
export const ATLAS = {
  shutter: px(0, 640, 256, 384),
  awning: px(256, 640, 256, 300),
  awningText: px(256, 940, 256, 84),
  posters: px(512, 640, 512, 384),
  green: px(260, 944, 4, 4),
};

export function signAtlas() {
  return canvasTex("street-signs", 1024, 1024, (ctx) => {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, 1024, 1024);
    const serif = "'Cormorant Garamond', 'Times New Roman', Georgia, serif";
    SIGNS.forEach((s, i) => {
      const x = (i % 2) * 512, y = Math.floor(i / 2) * 64;
      ctx.fillStyle = s.bg;
      ctx.fillRect(x, y, 512, 64);
      ctx.strokeStyle = s.fg;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 6, y + 6, 500, 52);
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (s.sub) {
        ctx.font = `700 34px ${serif}`;
        ctx.fillText(s.text.split("").join(String.fromCharCode(8202)), x + 256, y + 25);
        ctx.font = `italic 500 15px ${serif}`;
        ctx.fillText(s.sub, x + 256, y + 50);
      } else {
        ctx.font = `700 38px ${serif}`;
        ctx.fillText(s.text.split("").join(String.fromCharCode(8202)), x + 256, y + 34);
      }
    });
    // Rideau métallique: corrugated grey with a little grime.
    const g = ctx.createLinearGradient(0, 640, 0, 1024);
    g.addColorStop(0, "#9a9c9c");
    g.addColorStop(1, "#6e706f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 640, 256, 384);
    for (let y = 640; y < 1024; y += 8) {
      ctx.fillStyle = "rgba(40,40,40,0.45)";
      ctx.fillRect(0, y, 256, 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(0, y + 3, 256, 2);
    }
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(60,50,40,${0.05 + r() * 0.1})`;
      ctx.fillRect(r() * 256, 900 + r() * 120, 4 + r() * 30, 3 + r() * 12);
    }
    // Awning: classic burgundy and cream stripes, scalloped valance band below.
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? "#efe3c8" : "#7a1622";
      ctx.fillRect(256 + i * 16, 640, 16, 300);
    }
    ctx.fillStyle = "#7a1622";
    ctx.fillRect(256, 940, 256, 84);
    ctx.fillStyle = "#f0d590";
    ctx.font = `700 34px ${serif}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAFÉ · BRASSERIE", 384, 982);
    ctx.fillStyle = "#1e4a32";
    ctx.fillRect(256, 1020, 8, 4);
    // Morris column posters
    const pal = ["#d84a2a", "#f1c84a", "#2a4a8a", "#e8e0cc", "#1c1c1c", "#9a2a6a", "#3a8a6a"];
    ctx.fillStyle = "#e8e0cc";
    ctx.fillRect(512, 640, 512, 384);
    let x = 512;
    while (x < 1024) {
      const w = 70 + r() * 70;
      let y = 646;
      while (y < 1010) {
        const h = 90 + r() * 120;
        const c = pal[Math.floor(r() * pal.length)];
        ctx.fillStyle = c;
        ctx.fillRect(x + 3, y, Math.min(w - 6, 1021 - x), Math.min(h - 6, 1018 - y));
        ctx.fillStyle = c === "#e8e0cc" || c === "#f1c84a" ? "#1c1c1c" : "#f4ecd8";
        ctx.font = `700 ${16 + Math.floor(r() * 14)}px ${serif}`;
        ctx.textAlign = "left";
        ctx.fillText(["OPÉRA", "THÉÂTRE", "EXPO", "CINÉMA", "JAZZ", "BALLET", "CIRQUE"][Math.floor(r() * 7)], x + 10, y + 30);
        ctx.fillRect(x + 10, y + 46, (w - 26) * r(), 4);
        ctx.fillRect(x + 10, y + 56, (w - 26) * r(), 4);
        y += h;
      }
      x += w;
    }
  });
}

/** Wrought-iron balcony railing with alpha: uprights, top and bottom rails, and scrolls. 1 repeat = 1 m wide. */
export function railTexture() {
  const t = canvasTex("street-rail", 256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 256, 14);
    ctx.fillRect(0, 230, 256, 12);
    ctx.fillRect(0, 196, 256, 6);
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 5, 256);
    ctx.lineWidth = 5;
    for (let x = 0; x < 256; x += 64) {
      // a pair of facing scrolls in each panel
      ctx.beginPath();
      ctx.ellipse(x + 32, 70, 22, 40, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + 32, 150, 22, 40, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 32, 110, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Standing-seam zinc: vertical seams every 0.5 m (1 repeat = 1 m). */
export function zincTexture() {
  const t = canvasTex("street-zinc", 128, 128, (ctx) => {
    const r = rng(77);
    ctx.fillStyle = "#c4c9cc";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "60,70,80"},${0.03 + r() * 0.05})`;
      ctx.fillRect(r() * 128, r() * 128, 2 + r() * 30, 2 + r() * 40);
    }
    ctx.fillStyle = "rgba(40,45,50,0.55)";
    ctx.fillRect(0, 0, 4, 128);
    ctx.fillRect(64, 0, 4, 128);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(4, 0, 2, 128);
    ctx.fillRect(68, 0, 2, 128);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft radial falloff for fake pools of lamplight on the pavement. */
export function glowTexture() {
  return canvasTex("street-glow", 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}
