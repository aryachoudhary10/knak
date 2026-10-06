import * as THREE from "three";
import { checkerTexture, marbleTexture, mirrorTexture, pavingTexture } from "./textures";

let mats: ReturnType<typeof build> | null = null;

function build() {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const checker = checkerTexture().clone();
  checker.needsUpdate = true;
  checker.repeat.set((16 / 1.6), (20 / 1.6));
  const paving = pavingTexture().clone();
  paving.needsUpdate = true;
  paving.repeat.set(10, 5);
  return {
    stone: std({ color: "#efe7d6", roughness: 0.85 }),
    stoneShade: std({ color: "#e3d8c2", roughness: 0.9 }),
    plaster: std({ color: "#eadcbc", roughness: 0.9 }),
    gilt: std({ color: "#c9a24a", metalness: 0.85, roughness: 0.32 }),
    brass: std({ color: "#b8923f", metalness: 0.9, roughness: 0.28 }),
    darkWood: std({ color: "#3a2416", roughness: 0.55 }),
    walnut: std({ color: "#5a3820", roughness: 0.45 }),
    rattan: std({ color: "#b8874a", roughness: 0.7 }),
    cane: std({ color: "#d9b77c", roughness: 0.8 }),
    burgundy: std({ color: "#6e1a24", roughness: 0.75 }),
    linen: std({ color: "#f6f2ea", roughness: 0.9 }),
    blackIron: std({ color: "#1c1b1a", metalness: 0.6, roughness: 0.45 }),
    zinc: std({ color: "#a9adb0", metalness: 0.8, roughness: 0.3 }),
    leaf: std({ color: "#2f4a26", roughness: 0.9 }),
    curtain: std({ color: "#d8c59a", roughness: 0.95 }),
    mirror: std({ map: mirrorTexture(), emissive: "#ffffff", emissiveMap: mirrorTexture(), emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.15 }),
    glassWarm: std({ color: "#3a2a14", emissive: "#ffb85c", emissiveIntensity: 0.9, roughness: 0.2 }),
    glassDim: std({ color: "#20160c", emissive: "#ffb060", emissiveIntensity: 0.35, roughness: 0.2 }),
    flame: std({ color: "#fff3d0", emissive: "#ffd28a", emissiveIntensity: 3 }),
    crystal: new THREE.MeshStandardMaterial({ color: "#fff6e0", emissive: "#ffd9a0", emissiveIntensity: 0.8, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 }),
    checker: std({ map: checker, roughness: 0.25, metalness: 0.05 }),
    marble: std({ map: marbleTexture(), roughness: 0.25 }),
    paving: std({ map: paving, roughness: 0.9 }),
    road: std({ color: "#3b3a38", roughness: 0.95 }),
    ceiling: std({ color: "#f1e6cc", roughness: 0.95 }),
  };
}

export function useMats() {
  if (!mats) mats = build();
  return mats;
}
