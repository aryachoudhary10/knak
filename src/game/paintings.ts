import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * Loads a painting fetched at build time (scripts/fetch-paintings.mjs) without holding up the room: null until it
 * arrives, and for good if it can't be found, so the caller keeps whatever it showed before.
 */
export function usePainting(id: string | undefined, sizes: { computer: number; phone: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const { computer, phone } = sizes;
  useEffect(() => {
    if (!id) return;
    const small = window.matchMedia("(pointer: coarse)").matches;
    let live = true;
    new THREE.TextureLoader().load(
      `/paintings/${id}-${small ? phone : computer}.jpg`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        if (live) setTex(t);
        else t.dispose();
      },
      undefined,
      () => {},
    );
    return () => {
      live = false;
    };
  }, [id, computer, phone]);
  return tex;
}
