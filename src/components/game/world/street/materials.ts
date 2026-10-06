import * as THREE from "three";
import { pavingTexture } from "@/game/textures";
import type { Part } from "./kit";
import { glowTexture, railTexture, signAtlas, windowAtlas, zincTexture } from "./textures";

let mats: Record<Part, THREE.Material> | null = null;

/** One material per merged part. Built once and shared. */
export function streetMaterials() {
  if (mats) return mats;
  const paving = pavingTexture().clone();
  paving.needsUpdate = true;
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  const signs = signAtlas();
  mats = {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: "#2a2420", emissiveIntensity: 0.35 }),
    zinc: new THREE.MeshStandardMaterial({ map: zincTexture(), color: "#7f8a94", metalness: 0.45, roughness: 0.5, vertexColors: true }),
    iron: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.45 }),
    rail: new THREE.MeshStandardMaterial({ map: railTexture(), color: "#141414", alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }),
    lit: new THREE.MeshBasicMaterial({ map: windowAtlas(), vertexColors: true, toneMapped: false }),
    dark: new THREE.MeshStandardMaterial({ map: windowAtlas(), roughness: 0.15, metalness: 0.2, vertexColors: true }),
    atlas: new THREE.MeshStandardMaterial({ map: signs, emissiveMap: signs, emissive: "#ffffff", emissiveIntensity: 0.28, roughness: 0.75, vertexColors: true }),
    foliage: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    car: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.3 }),
    glow: new THREE.MeshBasicMaterial({ map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    paving: new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9, vertexColors: true }),
    road: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
  };
  return mats;
}
