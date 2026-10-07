import { GALLERY, SPIRAL } from "./layout";

const TURN = Math.PI * 2;

/**
 * Height of the round staircase's tread under (x, z), for a guest whose feet are at `foot`.
 * One full turn means two heights share each bearing near the seam, so the one nearest the guest's feet wins.
 * Returns null off the stairs (outside the ring, or more than a step away from any tread).
 */
export function stairFloor(x: number, z: number, foot: number): number | null {
  const dx = x - SPIRAL.x;
  const dz = z - SPIRAL.z;
  const r = Math.hypot(dx, dz);
  if (r > SPIRAL.r || r < SPIRAL.core) return null;
  const bearing = Math.atan2(dx, dz);
  const turn = (((bearing - SPIRAL.start) % TURN) + TURN) % TURN; // 0 at the foot, rising anticlockwise
  const h = (GALLERY.deck * turn) / TURN;
  const best = Math.abs(h - foot) <= Math.abs(h - GALLERY.deck - foot) ? h : h - GALLERY.deck;
  if (best < 0 || Math.abs(best - foot) > 0.7) return null;
  return best;
}
