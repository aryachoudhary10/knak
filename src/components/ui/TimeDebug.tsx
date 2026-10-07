"use client";

import { useState } from "react";
import { formatHour, timeDebugAllowed, useClock, useRestaurantHour } from "@/game/clock";
import { phaseOf } from "@/game/atmosphere";

const PRESETS = [6, 9, 12, 15, 17.5, 18.5, 19.5, 21, 23, 1];

/**
 * Development-only time control: scrub the restaurant's hour and watch the sky, sun, shadows, lamps and the clock follow.
 * It renders nothing in production unless the address has `?timedebug` (see game/clock.ts to switch that off).
 */
export default function TimeDebug() {
  const [allowed] = useState(() => timeDebugAllowed());
  if (!allowed) return null;
  return <Panel />;
}

function Panel() {
  const mode = useClock((s) => s.mode);
  const setDebugHour = useClock((s) => s.setDebugHour);
  const useRealTime = useClock((s) => s.useRealTime);
  const hour = useRestaurantHour() ?? 12;
  const [open, setOpen] = useState(true);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      onPointerDown={stop}
      onKeyDown={stop}
      className="pointer-events-auto absolute left-1/2 top-4 z-30 w-[min(92vw,30rem)] -translate-x-1/2 bg-ink/80 px-4 py-3 font-sans text-[10px] uppercase tracking-[0.18em] text-ivory/80 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span>
          Debug time · {formatHour(hour)} · {phaseOf(hour)}
          {mode === "real" ? " · real" : ""}
        </span>
        <button className="cursor-pointer text-ivory/60 hover:text-ivory" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <>
          <input
            type="range"
            min={0}
            max={24}
            step={1 / 60}
            value={hour}
            onChange={(e) => setDebugHour(Number(e.target.value))}
            className="mt-3 w-full accent-[#c8b27a]"
            aria-label="Restaurant time"
          />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {PRESETS.map((h) => (
              <button key={h} className="cursor-pointer tabular-nums text-ivory/70 hover:text-ivory" onClick={() => setDebugHour(h)}>
                {String(Math.floor(h)).padStart(2, "0")}:{h % 1 ? "30" : "00"}
              </button>
            ))}
            <button className={`ml-auto cursor-pointer ${mode === "real" ? "text-ivory" : "text-ivory/60 hover:text-ivory"}`} onClick={useRealTime}>
              Real time
            </button>
          </div>
        </>
      )}
    </div>
  );
}
