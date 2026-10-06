import * as THREE from "three";
import { caneTexture, checkerTexture, floorNormalTexture, marbleTexture, mirrorTexture, pavingTexture, tuftBumpTexture, walnutTexture } from "./textures";
import { isHighQuality } from "./quality";

let mats: ReturnType<typeof build> | null = null;

function cloneTex(t: THREE.Texture, rx: number, ry: number) {
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(rx, ry);
  return c;
}

function build() {
  const hq = isHighQuality();
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);

  const floorNormal = cloneTex(floorNormalTexture(), 16 / 1.6, 20 / 1.6);

  const walnut = walnutTexture();
  const tuft = cloneTex(tuftBumpTexture(), 24, 2);

  return {
    hq,
    floorNormal,
    stone: std({ color: "#efe7d6", roughness: 0.82 }),
    stoneShade: std({ color: "#e2d6bf", roughness: 0.88 }),
    plaster: std({ color: "#ecdfc2", roughness: 0.92 }),
    panel: std({ color: "#f1e6cb", roughness: 0.85 }),
    gilt: phys({ color: "#d4ab52", metalness: 1, roughness: 0.28, clearcoat: hq ? 0.4 : 0, clearcoatRoughness: 0.3 }),
    brass: phys({ color: "#c79c45", metalness: 1, roughness: 0.22, clearcoat: hq ? 0.5 : 0 }),
    darkWood: phys({ map: cloneTex(walnut, 2, 1), color: "#6b5040", roughness: 0.42, clearcoat: hq ? 0.6 : 0, clearcoatRoughness: 0.25 }),
    walnut: phys({ map: cloneTex(walnut, 3, 1), roughness: 0.38, clearcoat: hq ? 0.7 : 0, clearcoatRoughness: 0.2 }),
    rattan: phys({ map: cloneTex(walnut, 1, 4), color: "#d99a5a", roughness: 0.45, clearcoat: hq ? 0.5 : 0 }),
    cane: std({ color: "#d9b77c", roughness: 0.8 }),
    caneBack: std({ map: caneTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 }),
    burgundy: phys({ color: "#5c1520", roughness: 0.8, sheen: hq ? 1 : 0, sheenColor: new THREE.Color("#c0485a"), sheenRoughness: 0.45 }),
    tufted: phys({ color: "#5c1520", bumpMap: tuft, bumpScale: 3, roughness: 0.8, sheen: hq ? 1 : 0, sheenColor: new THREE.Color("#c0485a"), sheenRoughness: 0.45 }),
    linen: phys({ color: "#f3eee5", roughness: 0.92, side: THREE.DoubleSide, sheen: hq ? 0.6 : 0, sheenColor: new THREE.Color("#ffffff") }),
    porcelain: phys({ color: "#fbfaf6", roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
    silver: phys({ color: "#e4e4e4", metalness: 1, roughness: 0.18 }),
    glass: hq
      ? phys({ color: "#ffffff", transmission: 1, thickness: 0.05, roughness: 0.02, ior: 1.5, transparent: true })
      : std({ color: "#ffffff", transparent: true, opacity: 0.25, roughness: 0.05 }),
    blackIron: phys({ color: "#1a1918", metalness: 0.8, roughness: 0.4 }),
    zinc: phys({ color: "#b8bcbf", metalness: 0.9, roughness: 0.25, clearcoat: hq ? 0.3 : 0 }),
    leaf: std({ color: "#2c4a22", roughness: 0.85 }),
    curtain: phys({ color: "#cfb788", roughness: 0.9, sheen: hq ? 0.8 : 0, sheenColor: new THREE.Color("#fff1cf") }),
    mirror: std({ map: mirrorTexture(), emissive: "#ffffff", emissiveMap: mirrorTexture(), emissiveIntensity: 0.12, metalness: 0.2, roughness: 0.15 }),
    glassWarm: std({ color: "#2a1c0c", emissive: "#ffb257", emissiveIntensity: 2.2, roughness: 0.2, toneMapped: false }),
    glassDim: std({ color: "#20160c", emissive: "#ffb060", emissiveIntensity: 0.6, roughness: 0.15 }),
    flame: std({ color: "#fff3d0", emissive: "#ffcf80", emissiveIntensity: 6, toneMapped: false }),
    lampShade: std({ color: "#f3dcb4", emissive: "#ffbf72", emissiveIntensity: 1.35, roughness: 0.9, side: THREE.DoubleSide, toneMapped: false }),
    bulb: std({ color: "#fff6e0", emissive: "#ffd9a0", emissiveIntensity: 4, toneMapped: false }),
    crystal: hq
      ? phys({ color: "#ffffff", transmission: 0.9, roughness: 0, ior: 2.0, thickness: 0.02, metalness: 0, envMapIntensity: 2.5, transparent: true })
      : std({ color: "#fff6e0", emissive: "#ffd9a0", emissiveIntensity: 0.6, transparent: true, opacity: 0.7, roughness: 0.05 }),
    checker: std({ map: cloneTex(checkerTexture(), 16 / 0.9, 20 / 0.9), normalMap: floorNormal, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.42, metalness: 0 }),
    marble: std({ map: marbleTexture(), roughness: 0.38 }),
    paving: std({ map: cloneTex(pavingTexture(), 10, 5), roughness: 0.9 }),
    road: std({ color: "#34332f", roughness: 0.6 }),
    ceiling: std({ color: "#f3e8cf", roughness: 0.95 }),
  };
}

export function useMats() {
  if (!mats) mats = build();
  return mats;
}
