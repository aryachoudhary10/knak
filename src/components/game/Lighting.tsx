"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { isHighQuality } from "@/game/quality";
import { daylight, useIndiaHour } from "@/game/daylight";

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
        intensity={hq ? 11 : 9}
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

function FacadeWash({ x, lamps }: { x: number; lamps: number }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(x * 0.8, 7, 0);
    return o;
  }, [x]);
  return (
    <>
      <primitive object={target} />
      <spotLight position={[x, 0.15, 1.6]} target={target} angle={0.75} penumbra={0.8} intensity={30 * Math.max(lamps, 0.1)} distance={14} decay={1.6} color="#ffbf7a" />
    </>
  );
}

/**
 * Nothing that casts a shadow moves (people don't cast them), so the shadow maps are drawn for the
 * first frames after the room appears and then reused, instead of re-rendering the scene four extra times a frame.
 */
function FrozenShadows({ hour }: { hour: number }) {
  const get = useThree((s) => s.get);
  const frames = useRef(0);
  // Redraw them when the sun has moved.
  useEffect(() => {
    frames.current = 0;
  }, [hour]);
  useEffect(
    () => () => {
      get().gl.shadowMap.autoUpdate = true;
    },
    [get],
  );
  useFrame(({ gl }) => {
    if (frames.current > 30) return;
    frames.current++;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/** HDR image lighting for believable reflections, plus soft shadow-casting lights under the chandeliers. */
export default function Lighting() {
  const hq = isHighQuality();
  const hour = useIndiaHour();
  const d = useMemo(() => daylight(hour), [hour]);
  const sunAt = useMemo(() => d.dir.clone().multiplyScalar(25).toArray(), [d]);
  return (
    <>
      {hq && <FrozenShadows hour={hour} />}
      <Environment files="/hdri/lobby.exr" environmentIntensity={d.env} background={false} />
      <hemisphereLight color={d.hemiSky} groundColor="#3a2c20" intensity={d.hemi} />
      {/* the sun by day, moonlight by night, following the hour in India */}
      <directionalLight
        position={sunAt}
        intensity={d.sun}
        color={d.sunColor}
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
        <FacadeWash key={x} x={x} lamps={d.lamps} />
      ))}
      {/* chandelier pools of light that throw table and chair shadows on the marble */}
      {[-4.2, -9.2, -14.2].map((z) => (
        <DownLight key={z} z={z} hq={hq} />
      ))}
    </>
  );
}
