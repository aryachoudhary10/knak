"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { interact } from "@/components/game/Player";
import { runtime } from "@/game/runtime";
import { formatHour, useRestaurantHour } from "@/game/clock";
import { moodFor } from "@/game/atmosphere";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Exploration UI, kept to the corners like a film title card: the wordmark, sound, the hour, your table,
 * and one contextual prompt pinned beside whoever or whatever you are facing.
 */
export default function Hud() {
  const isTouch = useGame((s) => s.isTouch);
  const locked = useGame((s) => s.pointerLocked);
  const menuOpen = useGame((s) => s.menuOpen);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none text-ivory [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]">
      <AnimatePresence>
        {!menuOpen && (
          <motion.div key="chrome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Wordmark />
            <SoundToggle />
            <Hour />
            <YourTable />
          </motion.div>
        )}
      </AnimatePresence>

      {!isTouch && !menuOpen && <div className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory/55" />}

      {!menuOpen && <ContextPrompt isTouch={isTouch} />}

      <AnimatePresence>
        {!isTouch && !locked && !menuOpen && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="eyebrow absolute inset-x-0 top-1/2 mt-8 text-center text-ivory/60"
          >
            Click to look around
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="absolute left-6 top-6 sm:left-11 sm:top-10">
      <p className="font-display text-[22px] leading-none tracking-[0.55em] text-ivory/90 sm:text-[26px]">KNAK</p>
      <p className="eyebrow mt-2 text-[9px] text-ivory/60">Grand Café</p>
    </div>
  );
}

function SoundToggle() {
  const soundOn = useGame((s) => s.soundOn);
  const toggleSound = useGame((s) => s.toggleSound);
  return (
    <button
      onClick={toggleSound}
      aria-label={soundOn ? "Mute sound" : "Turn sound on"}
      className="pointer-events-auto absolute right-6 top-6 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ivory/35 text-ivory/80 transition-colors duration-300 hover:border-ivory/70 hover:text-ivory sm:right-11 sm:top-9"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
      </svg>
    </button>
  );
}

/** KNAK's own time, the way a hotel lobby clock reminds you where the evening is; the light outside follows it. */
function Hour() {
  const h = useRestaurantHour();
  if (h === null) return null;
  return (
    <div className="absolute bottom-7 left-6 hidden sm:bottom-10 sm:left-11 sm:block">
      <p className="font-sans text-[19px] font-light tracking-[0.18em] text-ivory/90">{formatHour(h)}</p>
      <p className="eyebrow mt-2 max-w-[11rem] text-[9px] leading-[1.7] text-ivory/60">
        {moodFor(h)}
        <br />
        at KNAK
      </p>
    </div>
  );
}

function YourTable() {
  const count = useGame((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const openMenu = useGame((s) => s.openMenu);
  return (
    <button
      onClick={() => {
        if (document.pointerLockElement) document.exitPointerLock();
        openMenu();
      }}
      className="pointer-events-auto absolute bottom-7 right-6 flex cursor-pointer items-center gap-5 text-ivory/80 transition-colors duration-300 hover:text-ivory sm:bottom-10 sm:right-11"
    >
      <span className="eyebrow text-[10px]">Your table</span>
      <span className="flex items-center gap-2">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M5 8h14l-1 13H6L5 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <span className="font-sans text-xs tabular-nums">{count}</span>
      </span>
    </button>
  );
}

function ContextPrompt({ isTouch }: { isTouch: boolean }) {
  const prompt = useGame((s) => s.prompt);
  const key = prompt ? `${prompt.kind}-${prompt.title}-${prompt.action}` : "none";
  return (
    <div
      ref={(el) => {
        runtime.promptEl = el;
      }}
      data-mode="center"
      className="group absolute left-0 top-0 will-change-transform"
    >
      <AnimatePresence mode="wait">
        {prompt && (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex -translate-y-1/2 items-center group-data-[flip=1]:-translate-x-full group-data-[flip=1]:flex-row-reverse group-data-[mode=center]:-translate-x-1/2"
          >
            <span className="h-[8px] w-[8px] -translate-x-1/2 rounded-full border border-ivory bg-ivory/90 group-data-[flip=1]:translate-x-1/2 group-data-[mode=center]:hidden" />
            <span className="h-px w-12 bg-ivory/55 group-data-[mode=center]:hidden sm:w-16" />
            <button
              type="button"
              onClick={interact}
              tabIndex={-1}
              className={`flex flex-col px-4 text-left group-data-[flip=1]:items-end group-data-[flip=1]:text-right group-data-[mode=center]:items-center group-data-[mode=center]:text-center ${isTouch ? "pointer-events-auto" : ""}`}
            >
              <span className="font-display text-[19px] uppercase leading-none tracking-[0.16em] text-ivory sm:text-[21px]">{prompt.title}</span>
              <span className="eyebrow mt-2 text-[9px] text-ivory/70">{prompt.meta}</span>
              <span className="mt-3 h-px w-full min-w-24 bg-ivory/30" />
              <span className="mt-3 flex items-center gap-3">
                {!isTouch && <kbd className="font-sans text-[9px] tracking-[0.2em] text-ivory/45">E</kbd>}
                <span className="eyebrow text-[10px] text-ivory">
                  {prompt.action} <span className="ml-1">→</span>
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
