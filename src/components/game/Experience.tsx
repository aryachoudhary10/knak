"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, MotionConfig } from "motion/react";
import Warmup from "./Warmup";
import BarSalon from "./world/BarSalon";
import Gallery from "./world/Gallery";
import WinterGarden from "./world/WinterGarden";
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
import LiveGuests from "./world/LiveGuests";
import { addSample, peers } from "@/game/live";
import Director from "./Director";
import PromptTracker from "./PromptTracker";
import Effects from "./Effects";
import Lighting from "./Lighting";
import IntroOverlay from "@/components/ui/IntroOverlay";
import Subtitles from "@/components/ui/Subtitles";
import { isHighQuality } from "@/game/quality";
import Hud from "@/components/ui/Hud";
import ChatPanel from "@/components/ui/ChatPanel";
import LookPicker from "@/components/ui/LookPicker";
import { useChat } from "@/game/chat";
import TimeDebug from "@/components/ui/TimeDebug";
import Welcome from "@/components/ui/Welcome";
import MenuCard from "@/components/ui/MenuCard";
import AuthPanel from "@/components/ui/AuthPanel";
import { useAuth } from "@/game/auth";
import TouchControls from "@/components/ui/TouchControls";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { useClock } from "@/game/clock";

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
  if (s.isTouch || s.menuOpen || s.phase !== "playing" || useChat.getState().open) return;
  const canvas = document.querySelector("canvas");
  // Some browsers reject the request if it comes too soon after an exit; that is harmless.
  canvas?.requestPointerLock?.()?.catch?.(() => {});
}

const coarse = () => window.matchMedia("(pointer: coarse)").matches;

export default function Experience() {
  // Sharpness is traded for a steady frame rate: start modest, rise only while frames stay fast.
  // Phones have small, dense screens: below about 1.5 the room turns visibly blocky, so they keep a higher floor.
  const [dpr, setDpr] = useState(() => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, coarse() ? 1.75 : 1.25)));
  const [ao, setAo] = useState(true);
  const isTouch = useGame((s) => s.isTouch);
  const phase = useGame((s) => s.phase);
  const intro = useGame((s) => s.intro);
  usePointerLook();
  // Let the invitation's title settle before the room is built: building it (painting the marble, compiling
  // materials) holds the phone's main thread for a moment, which would otherwise stutter the opening animation.
  const [build, setBuild] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBuild(true), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    useGame.getState().setTouch(window.matchMedia("(pointer: coarse)").matches);
    useAuth.getState().init();
    // Handy for debugging and automated screenshots in development.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __knak: useGame, __runtime: runtime, __clock: useClock, __live: { peers, addSample }, __chat: useChat, __auth: useAuth });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 bg-ink">
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
          {/* Judge the frame rate only once the guest is walking, never while the room is still loading. */}
          {phase === "playing" && !intro && (
          <PerformanceMonitor
            flipflops={4}
            onDecline={() => {
              // Drop ambient occlusion first; only then lower the resolution.
              if (ao) setAo(false);
              else setDpr((d) => Math.max(isTouch ? 1.4 : 0.8, d - 0.15));
            }}
            onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio, isTouch ? 2 : 1.5, d + 0.15))}
          />
          )}
          {build && <Lighting />}
          {build && (
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]} timeStep="vary">
              <Street />
              <Facade />
              <Interior />
              <Furniture />
              <Counter />
              <BarSalon />
              <Gallery />
              <WinterGarden />
              <People />
              <LiveGuests />
              <Player />
            </Physics>
            <Director />
            <PromptTracker />
            <Effects ao={ao} />
            <Warmup />
          </Suspense>
          )}
        </Canvas>
        {phase === "playing" && intro && <IntroOverlay />}
        {phase === "playing" && !intro && <Hud />}
        {phase === "playing" && !intro && <ChatPanel />}
        {phase === "playing" && <TimeDebug />}
        <Subtitles />
        {phase === "playing" && !intro && isTouch && <TouchControls />}
        <MenuCard />
        <AuthPanel />
        <LookPicker />
        <AnimatePresence>{phase === "welcome" && <Welcome key="welcome" />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}
