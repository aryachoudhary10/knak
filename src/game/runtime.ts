import * as THREE from "three";

/** Per-frame values shared between scene components without React re-renders. */
export const runtime = {
  playerPos: new THREE.Vector3(),
  /** Requested teleport (used when standing up from a chair). */
  teleport: null as THREE.Vector3 | null,
  /** Clock time when the host started her greeting (seconds), or -1. */
  greetAt: -1,
  /** Clock time when the cashier last spoke, or -1. */
  cashierAt: -1,
  /** Set to a copy of elapsed time every frame so DOM code can stamp events. */
  now: 0,
  /** World point the contextual prompt points at (host, counter, table), or null to sit at the bottom centre. */
  promptAnchor: null as THREE.Vector3 | null,
  /** The prompt's DOM node, positioned every frame from the 3D anchor. */
  promptEl: null as HTMLElement | null,
};
