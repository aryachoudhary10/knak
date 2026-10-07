import { useEffect, useState } from "react";
import { create } from "zustand";

/**
 * KNAK keeps its own time. The light, the sky and the clock in the corner follow the hour where the restaurant is,
 * not the guest's computer, so everyone walks into the same moment of the day.
 * Set NEXT_PUBLIC_RESTAURANT_TIMEZONE (an IANA name such as "Europe/Paris") to move the restaurant.
 */
export const RESTAURANT_TIMEZONE = process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE || "Asia/Kolkata";

/**
 * Debug time lets the hour be set by hand to check the light at 08:00, 17:30, 23:00 and so on.
 * It is always on in development. In production it only appears with `?timedebug` in the address
 * (or NEXT_PUBLIC_TIME_DEBUG=1); set this to false to switch it off for good.
 */
const DEBUG_IN_PRODUCTION = true;

export function timeDebugAllowed() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TIME_DEBUG === "1") return true;
  if (!DEBUG_IN_PRODUCTION || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("timedebug");
}

let format: Intl.DateTimeFormat | null = null;

/** The hour in the restaurant's time zone, as a fraction (17.5 is half past five in the evening). */
export function restaurantHour(now = new Date()) {
  try {
    format ??= new Intl.DateTimeFormat("en-GB", { timeZone: RESTAURANT_TIMEZONE, hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
    let h = 0;
    for (const p of format.formatToParts(now)) {
      if (p.type === "hour") h += Number(p.value);
      else if (p.type === "minute") h += Number(p.value) / 60;
      else if (p.type === "second") h += Number(p.value) / 3600;
    }
    return h % 24;
  } catch {
    // An unknown zone name falls back to India, KNAK's home.
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60 + 330;
    return (minutes % 1440) / 60;
  }
}

function hourFromAddress() {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("hour");
  if (v === null || v.trim() === "" || Number.isNaN(Number(v))) return null;
  return ((Number(v) % 24) + 24) % 24;
}

type Clock = {
  mode: "real" | "debug";
  /** the hour chosen by hand in debug mode */
  debugHour: number;
  setDebugHour: (h: number) => void;
  useRealTime: () => void;
};

export const useClock = create<Clock>((set) => {
  // `?hour=18.5` in the address opens straight into that hour, for previews.
  const fromUrl = hourFromAddress();
  return {
    mode: fromUrl === null ? "real" : "debug",
    debugHour: fromUrl ?? 12,
    setDebugHour: (h) => set({ mode: "debug", debugHour: ((h % 24) + 24) % 24 }),
    useRealTime: () => set({ mode: "real" }),
  };
});

/** The hour the restaurant is living right now: real time, or the debug hour when one is set. */
export function currentHour(now = new Date()) {
  const c = useClock.getState();
  return c.mode === "debug" ? c.debugHour : restaurantHour(now);
}

/** The current hour for UI text, refreshed every 15 seconds and immediately when debug time changes. */
export function useRestaurantHour() {
  const mode = useClock((s) => s.mode);
  const debugHour = useClock((s) => s.debugHour);
  const [real, setReal] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setReal(restaurantHour());
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  if (mode === "debug") return debugHour;
  return real;
}

/** "5:27 PM" */
export function formatHour(h: number) {
  const mins = Math.floor(h * 60 + 1e-6) % 1440;
  const hh = Math.floor(mins / 60);
  return `${((hh + 11) % 12) + 1}:${String(mins % 60).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}
