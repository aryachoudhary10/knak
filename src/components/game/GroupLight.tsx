"use client";

import { useLayoutEffect, useRef } from "react";
import type * as THREE from "three";
import { registerLamp, type LightGroup } from "@/game/atmosphere";

type Props = Omit<React.ComponentProps<"pointLight">, "intensity" | "ref"> & { group: LightGroup; intensity: number };

/** A point light whose strength follows its light group through the day; `intensity` is its full evening level. */
export default function GroupLight({ group, intensity, ...rest }: Props) {
  const ref = useRef<THREE.PointLight>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return registerLamp(group, ref.current, intensity);
  }, [group, intensity]);
  return <pointLight ref={ref} {...rest} />;
}
