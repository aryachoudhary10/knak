import * as THREE from "three";

/** Per-frame values shared between scene components without React re-renders. */
export const runtime = {
  playerPos: new THREE.Vector3(),
  /** Requested teleport (used when standing up from a chair). */
  teleport: null as THREE.Vector3 | null,
};
