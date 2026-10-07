"use client";
// TEMPORARY: renders guest portraits for the character picker. Not committed.
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";

import { useSearchParams } from "next/navigation";
import { GUEST_AVATARS, Human } from "@/components/game/world/Human";

function Scene() {
  const i = Number(useSearchParams().get("i") ?? 0);
  return (
    <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={2} camera={{ position: [0, 1.38, 2.1], fov: 26 }} onCreated={({ camera }) => camera.lookAt(0, 1.18, 0)}>
      <color attach="background" args={["#1b1714"]} />
      <ambientLight intensity={0.9} /><hemisphereLight args={["#fff3e0", "#2a1f18", 0.8]} />
      <directionalLight position={[1.5, 2.5, 2]} intensity={2.2} color="#ffe2bf" />
      <directionalLight position={[-2, 2, -1]} intensity={1.2} color="#c4b08c" />
      <Suspense fallback={null}>
        <group rotation={[0, -0.25, 0]}>
          <Human avatar={GUEST_AVATARS[i]} pick={() => "stand_idle"} seed={0} />
        </group>
      </Suspense>
    </Canvas>
  );
}

export default function Page() {
  return (
    <div style={{ width: 300, height: 400 }} id="shot">
      <Suspense>
        <Scene />
      </Suspense>
    </div>
  );
}
