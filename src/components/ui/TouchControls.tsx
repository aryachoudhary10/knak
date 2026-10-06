"use client";

import { useRef, useState } from "react";
import { useGame } from "@/game/store";

const RADIUS = 52;

/** Left thumb joystick to walk, drag anywhere on the right to look. */
export default function TouchControls() {
  const menuOpen = useGame((s) => s.menuOpen);
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  if (menuOpen) return null;

  return (
    <div className="absolute inset-0 z-[5] flex touch-none select-none">
      {/* walk zone */}
      <div
        className="relative h-full w-1/2"
        onPointerDown={(e) => {
          if (stick.current) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          setKnob({ x: 0, y: 0, active: true });
        }}
        onPointerMove={(e) => {
          const s = stick.current;
          if (!s || s.id !== e.pointerId) return;
          let dx = e.clientX - s.x;
          let dy = e.clientY - s.y;
          const d = Math.hypot(dx, dy);
          if (d > RADIUS) {
            dx = (dx / d) * RADIUS;
            dy = (dy / d) * RADIUS;
          }
          setKnob({ x: dx, y: dy, active: true });
          const g = useGame.getState();
          g.setMove(dx / RADIUS, -dy / RADIUS);
          g.setRunning(d > RADIUS * 1.6);
        }}
        onPointerUp={(e) => {
          if (stick.current?.id !== e.pointerId) return;
          stick.current = null;
          setKnob({ x: 0, y: 0, active: false });
          useGame.getState().setMove(0, 0);
          useGame.getState().setRunning(false);
        }}
        onPointerCancel={() => {
          stick.current = null;
          setKnob({ x: 0, y: 0, active: false });
          useGame.getState().setMove(0, 0);
        }}
      >
        <div className="pointer-events-none absolute bottom-10 left-8 h-32 w-32 rounded-full border-2 border-[#e6c77a]/60 bg-[#1c1410]/30">
          <div
            className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-[#e6c77a] bg-[#6e1a24]/80 shadow-lg"
            style={{
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
              transition: knob.active ? "none" : "transform 120ms ease-out",
            }}
          />
        </div>
      </div>
      {/* look zone */}
      <div
        className="h-full w-1/2"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const l = look.current;
          if (!l || l.id !== e.pointerId) return;
          useGame.getState().look((e.clientX - l.x) * 0.0055, (e.clientY - l.y) * 0.0055);
          l.x = e.clientX;
          l.y = e.clientY;
        }}
        onPointerUp={() => (look.current = null)}
        onPointerCancel={() => (look.current = null)}
      />
    </div>
  );
}
