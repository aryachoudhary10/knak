import * as THREE from "three";
import { canvasTexture, veins } from "./textures";

/**
 * Surfaces modelled on Belle Époque Paris dining rooms (Le Train Bleu, Café de la Paix, the Ritz):
 * cabochon marble floors with brass-edged black insets, a Nero Marquina border, a wool runner to the counter,
 * and painted sky frescoes set into gilded ceiling coffers.
 */

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Two by two cabochon tiles: Calacatta octagons with a small black marble diamond at every corner. */
export function cabochonTexture() {
  return canvasTexture("cabochon", 1024, 1024, (ctx) => {
    const T = 512;
    const c = 92; // half diagonal of the corner diamond
    const r = rng(7);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.save();
        ctx.translate(i * T, j * T);
        ctx.beginPath();
        ctx.moveTo(c, 0);
        ctx.lineTo(T - c, 0);
        ctx.lineTo(T, c);
        ctx.lineTo(T, T - c);
        ctx.lineTo(T - c, T);
        ctx.lineTo(c, T);
        ctx.lineTo(0, T - c);
        ctx.lineTo(0, c);
        ctx.closePath();
        ctx.clip();
        const g = ctx.createLinearGradient(r() * T, 0, T, T * r());
        g.addColorStop(0, "#f1ebe1");
        g.addColorStop(0.5, "#e9e1d4");
        g.addColorStop(1, "#f4efe6");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, T, T);
        // soft cloudy patches, then fine grey and faint gold veins
        for (let k = 0; k < 14; k++) {
          const x = r() * T, y = r() * T, rad = 40 + r() * 140;
          const cg = ctx.createRadialGradient(x, y, 0, x, y, rad);
          cg.addColorStop(0, "rgba(205,196,184,0.22)");
          cg.addColorStop(1, "rgba(205,196,184,0)");
          ctx.fillStyle = cg;
          ctx.fillRect(0, 0, T, T);
        }
        veins(ctx, T, T, "#8f877c", 9, 13 + i * 7 + j * 31);
        veins(ctx, T, T, "#b49a6a", 3, 101 + i * 5 + j * 17);
        ctx.restore();
      }
    }
    // grout lines along the octagon edges
    ctx.strokeStyle = "rgba(120,108,92,0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      for (let j = 0; j <= 2; j++) {
        const x = i * T, y = j * T;
        // the black cabochon, edged in brass
        ctx.beginPath();
        ctx.moveTo(x, y - c);
        ctx.lineTo(x + c, y);
        ctx.lineTo(x, y + c);
        ctx.lineTo(x - c, y);
        ctx.closePath();
        const dg = ctx.createLinearGradient(x - c, y - c, x + c, y + c);
        dg.addColorStop(0, "#1b1715");
        dg.addColorStop(1, "#0f0d0c");
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.save();
        ctx.clip();
        veins(ctx, 2 * c, 2 * c, "#d8d0c4", 2, 3 + i * 11 + j * 3);
        ctx.restore();
        ctx.strokeStyle = "#b8914c";
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(120,108,92,0.5)";
    ctx.lineWidth = 2;
    for (let k = 0; k <= 2; k++) {
      ctx.beginPath();
      for (let m = 0; m < 2; m++) {
        ctx.moveTo(k * T, m * T + c);
        ctx.lineTo(k * T, m * T + T - c);
        ctx.moveTo(m * T + c, k * T);
        ctx.lineTo(m * T + T - c, k * T);
      }
      ctx.stroke();
    }
  });
}

/** Nero Marquina: deep black marble with fine white veining, for the border band. */
export function neroTexture() {
  return canvasTexture("nero", 512, 512, (ctx) => {
    ctx.fillStyle = "#141110";
    ctx.fillRect(0, 0, 512, 512);
    const r = rng(41);
    for (let k = 0; k < 10; k++) {
      const x = r() * 512, y = r() * 512, rad = 60 + r() * 160;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(60,52,46,0.35)");
      g.addColorStop(1, "rgba(60,52,46,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
    }
    veins(ctx, 512, 512, "#e6ddd0", 14, 77);
  });
}

/** Burgundy wool runner with a double gold border and a field of small gold lozenges. Width runs along u. */
export function runnerTexture() {
  return canvasTexture("runner", 512, 1024, (ctx) => {
    ctx.fillStyle = "#56131d";
    ctx.fillRect(0, 0, 512, 1024);
    const r = rng(5);
    // wool texture
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,200,190,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(r() * 512, r() * 1024, 2, 2);
    }
    const gold = "#c9a050";
    ctx.fillStyle = "#3d0c14";
    ctx.fillRect(0, 0, 58, 1024);
    ctx.fillRect(454, 0, 58, 1024);
    ctx.fillStyle = gold;
    for (const x of [14, 50, 456, 492]) ctx.fillRect(x, 0, 6, 1024);
    // lozenge diaper pattern in the field
    ctx.strokeStyle = "rgba(201,160,80,0.55)";
    ctx.lineWidth = 3;
    for (let y = 0; y < 1024; y += 128) {
      for (let x = 128; x <= 384; x += 128) {
        const cy = y + 64;
        ctx.beginPath();
        ctx.moveTo(x, cy - 34);
        ctx.lineTo(x + 22, cy);
        ctx.lineTo(x, cy + 34);
        ctx.lineTo(x - 22, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.arc(x, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(201,160,80,0.35)";
    for (let y = 0; y < 1024; y += 128) for (const x of [192, 320]) ctx.fillRect(x - 3, y - 3, 6, 6);
  });
}

/** A painted evening sky with soft clouds, for the ceiling coffers. */
export function frescoTexture(seed: number) {
  return canvasTexture(`fresco-${seed}`, 1024, 640, (ctx) => {
    const w = 1024, h = 640;
    const r = rng(seed * 97 + 3);
    const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, "#7895bf");
    g.addColorStop(0.55, "#a9afc6");
    g.addColorStop(1, "#dcb489");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.filter = "blur(22px)";
    for (let k = 0; k < 26; k++) {
      const x = r() * w, y = r() * h, rad = 50 + r() * 130;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const warm = r() > 0.6;
      cg.addColorStop(0, warm ? "rgba(255,228,200,0.85)" : "rgba(250,248,244,0.8)");
      cg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(x, y, rad * 1.6, rad * 0.8, r() * 0.6 - 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.filter = "none";
    // painted shadow toward the frame, as on a real ceiling canvas
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.6);
    v.addColorStop(0, "rgba(90,60,30,0)");
    v.addColorStop(1, "rgba(90,60,30,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c79c4e";
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, w - 44, h - 44);
  });
}

function repeat(t: THREE.Texture, x: number, y: number) {
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
}

let mats: ReturnType<typeof build> | null = null;

function build() {
  return {
    cabochon: (fieldW: number, fieldD: number) =>
      new THREE.MeshStandardMaterial({ map: repeat(cabochonTexture(), fieldW, fieldD), roughness: 0.2, metalness: 0 }),
    nero: (w: number, d: number) => new THREE.MeshStandardMaterial({ map: repeat(neroTexture(), w / 1.5, d / 1.5), roughness: 0.32, metalness: 0 }),
    runner: (len: number) => new THREE.MeshStandardMaterial({ map: repeat(runnerTexture(), 1, len / 3.2), roughness: 1, metalness: 0 }),
    fresco: (seed: number) => {
      const t = frescoTexture(seed);
      return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.2, roughness: 1 });
    },
    cove: new THREE.MeshStandardMaterial({ color: "#2a1a08", emissive: "#ffbe6e", emissiveIntensity: 2.4, toneMapped: false }),
    cream: new THREE.MeshStandardMaterial({ color: "#efe3c8", roughness: 0.85 }),
    creamShade: new THREE.MeshStandardMaterial({ color: "#e2d2b0", roughness: 0.9 }),
  };
}

/** Shared luxury materials, created once on the client. */
export function luxuryMats() {
  return (mats ??= build());
}
