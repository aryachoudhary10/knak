import * as THREE from "three";

/**
 * Window glass shared by the dining room and the winter garden. Its opacity follows the hour (game/atmosphere.ts):
 * nearly clear by day, and at night it picks up faint reflections of the lit room, as real glass does.
 */
export const windowGlass = new THREE.MeshPhysicalMaterial({ color: "#c9d4dc", transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0, depthWrite: false });

/** Clear glass with just a trace of green, as old conservatory glass has. */
export const gardenGlass = new THREE.MeshPhysicalMaterial({ color: "#dfe8dc", transparent: true, opacity: 0.12, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
