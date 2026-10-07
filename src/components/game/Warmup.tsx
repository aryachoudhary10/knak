"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGame } from "@/game/store";

/**
 * Compiles every material in the scene while the invitation is showing, so the first steps inside are smooth
 * instead of pausing each time a new part of the room comes into view.
 */
export default function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      useGame.getState().setWarm();
    };
    // Never hold the guest at the door for long, even on a device that compiles slowly.
    const timer = setTimeout(finish, 9000);
    gl.compileAsync(scene, camera).then(finish, finish);
    return () => clearTimeout(timer);
  }, [gl, scene, camera]);
  return null;
}
