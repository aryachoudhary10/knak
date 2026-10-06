"use client";

import { useMemo } from "react";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { isHighQuality } from "@/game/quality";

function DownLight({ z, hq }: { z: number; hq: boolean }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, z);
    return o;
  }, [z]);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[0, 5.4, z]}
        target={target}
        angle={1.15}
        penumbra={1}
        intensity={hq ? 22 : 16}
        distance={14}
        decay={1.4}
        color="#ffd2a0"
        castShadow={hq}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
    </>
  );
}

function FacadeWash({ x }: { x: number }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(x * 0.8, 7, 0);
    return o;
  }, [x]);
  return (
    <>
      <primitive object={target} />
      <spotLight position={[x, 0.15, 1.6]} target={target} angle={0.75} penumbra={0.8} intensity={30} distance={14} decay={1.6} color="#ffbf7a" />
    </>
  );
}

/** HDR image lighting for believable reflections, plus soft shadow-casting lights under the chandeliers. */
export default function Lighting() {
  const hq = isHighQuality();
  return (
    <>
      <Environment files="/hdri/lobby.exr" environmentIntensity={0.22} background={false} />
      <hemisphereLight args={["#9db0d6", "#2a1d14", 0.12]} />
      {/* dusk light on the street, casting long soft shadows */}
      <directionalLight
        position={[-12, 9, 16]}
        intensity={0.35}
        color="#9fb6e0"
        castShadow={hq}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* warm uplights washing the facade, the way grand cafés are lit at night */}
      {[-4.6, 4.6].map((x) => (
        <FacadeWash key={x} x={x} />
      ))}
      {/* chandelier pools of light that throw table and chair shadows on the marble */}
      {[-4.2, -9.2, -14.2].map((z) => (
        <DownLight key={z} z={z} hq={hq} />
      ))}
    </>
  );
}
