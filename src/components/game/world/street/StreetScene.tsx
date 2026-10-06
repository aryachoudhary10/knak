"use client";

import { useEffect, useMemo } from "react";
import { isHighQuality } from "@/game/quality";
import type { Part } from "./kit";
import { buildStreet } from "./layout";
import { streetMaterials } from "./materials";

/** Everything around the café: Haussmann neighbours, the far side of the street and its furniture. */
export default function StreetScene() {
  const hq = isHighQuality();
  const { parts } = useMemo(() => buildStreet(hq), [hq]);
  const mats = streetMaterials();
  useEffect(() => () => parts.forEach((g) => g.dispose()), [parts]);
  return (
    <group>
      {[...parts].map(([part, geo]) => (
        <mesh key={part} geometry={geo} material={mats[part as Part]} receiveShadow={hq && (part === "paving" || part === "road" || part === "paint")} frustumCulled={false} renderOrder={part === "glow" ? 1 : 0} />
      ))}
    </group>
  );
}
