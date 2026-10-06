"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import Street from "./world/Street";
import Facade from "./world/Facade";
import Interior from "./world/Interior";
import Furniture from "./world/Furniture";
import Counter from "./world/Counter";
import People from "./world/People";
import Player from "./Player";
import Director from "./Director";
import Effects from "./Effects";
import Lighting from "./Lighting";
import IntroOverlay from "@/components/ui/IntroOverlay";
import Subtitles from "@/components/ui/Subtitles";
import { isHighQuality } from "@/game/quality";
import Hud from "@/components/ui/Hud";
import Welcome from "@/components/ui/Welcome";
import MenuCard from "@/components/ui/MenuCard";
import TouchControls from "@/components/ui/TouchControls";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";

function usePointerLook() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      useGame.getState().look(e.movementX * 0.0022, e.movementY * 0.0022);
    };
    const onLock = () => useGame.getState().setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, []);
}

export function requestLook() {
  const s = useGame.getState();
  if (s.isTouch || s.menuOpen || s.phase !== "playing") return;
  const canvas = document.querySelector("canvas");
  // Some browsers reject the request if it comes too soon after an exit; that is harmless.
  canvas?.requestPointerLock?.()?.catch?.(() => {});
}

export default function Experience() {
  const [dpr, setDpr] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? 1.25 : 1.5,
  );
  const isTouch = useGame((s) => s.isTouch);
  const phase = useGame((s) => s.phase);
  const intro = useGame((s) => s.intro);
  usePointerLook();

  useEffect(() => {
    useGame.getState().setTouch(window.matchMedia("(pointer: coarse)").matches);
    // Handy for debugging and automated screenshots in development.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __knak: useGame, __runtime: runtime });
  }, []);

  return (
    <div className="fixed inset-0 bg-[#120d0a]">
      <Canvas
        dpr={dpr}
        camera={{ fov: 72, near: 0.05, far: 400, position: [0, 1.6, 7.5] }}
        shadows={isHighQuality()}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          // Tone mapping happens in the post-processing chain.
          gl.toneMapping = THREE.NoToneMapping;
        }}
        onPointerDown={() => requestLook()}
      >
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))} onIncline={() => setDpr((d) => Math.min(isTouch ? 1.5 : 2, d + 0.25))} />
        <color attach="background" args={["#2a2230"]} />
        <fog attach="fog" args={["#3a2c33", 35, 110]} />
        <Lighting />
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} timeStep="vary">
            <Street />
            <Facade />
            <Interior />
            <Furniture />
            <Counter />
            <People />
            <Player />
          </Physics>
          <Director />
          <Effects />
        </Suspense>
      </Canvas>
      {phase === "playing" && intro && <IntroOverlay />}
      {phase === "playing" && !intro && <Hud />}
      <Subtitles />
      {phase === "playing" && !intro && isTouch && <TouchControls />}
      <MenuCard />
      {phase === "welcome" && <Welcome />}
    </div>
  );
}
