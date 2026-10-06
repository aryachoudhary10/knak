/** Rendering tier, decided once on the client. Phones get the lighter path. */
let high: boolean | null = null;

export function isHighQuality() {
  if (high === null) {
    high =
      typeof window !== "undefined" &&
      !window.matchMedia("(pointer: coarse)").matches &&
      (navigator.hardwareConcurrency ?? 4) >= 4;
  }
  return high;
}
