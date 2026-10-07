"use client";

import { useProgress } from "@react-three/drei";
import { motion } from "motion/react";
import { useGame } from "@/game/store";
import Avatar from "./Avatar";
import { requestLook } from "@/components/game/Experience";
import { startAudio } from "@/game/audio";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay, ease: EASE },
});

/** The invitation: a quiet card of type over the street at dusk, not a login screen. */
export default function Welcome() {
  const character = useGame((s) => s.character);
  const reroll = useGame((s) => s.rerollCharacter);
  const enter = useGame((s) => s.enter);
  const isTouch = useGame((s) => s.isTouch);
  const { active, progress } = useProgress();
  const ready = !active || progress >= 100;

  const go = () => {
    startAudio();
    // Load voices early so the first greeting has a good one.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
    enter();
    requestAnimationFrame(() => requestLook());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-30 flex flex-col bg-ink/70 px-6 py-6 text-ivory sm:px-14 sm:py-10"
    >
      <header className="flex items-center justify-between">
        <p className="font-display text-[15px] tracking-[0.5em] text-ivory/80">KNAK</p>
        <p className="eyebrow hidden text-ivory/50 sm:block">Grand Café · Paris</p>
      </header>

      <main className="flex flex-1 flex-col justify-center sm:max-w-xl">
        <motion.p {...rise(0.2)} className="eyebrow text-champagne">
          An invitation
        </motion.p>
        <motion.h1 {...rise(0.35)} className="mt-6 font-display text-[64px] font-normal leading-none tracking-[0.28em] sm:text-[104px]">
          KNAK
        </motion.h1>
        <motion.p {...rise(0.55)} className="mt-5 font-display text-lg italic text-ivory/75 sm:text-xl">
          A grand café of Paris, brought to your door.
        </motion.p>

        <motion.div {...rise(0.75)} className="mt-12 h-px w-12 bg-champagne/60" />

        <motion.div {...rise(0.85)} className="mt-10">
          <p className="eyebrow text-ivory/50">This evening’s guest</p>
          <div className="mt-4 flex items-center gap-5">
            <Avatar c={character} size={52} />
            <div>
              <p className="font-display text-2xl">{character.name}</p>
              <button onClick={reroll} className="text-action mt-1 text-[10px] text-ivory/60 hover:text-ivory">
                Change appearance
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div {...rise(1.05)} className="mt-14">
          {ready ? (
            <button onClick={go} className="text-action text-[13px] text-ivory">
              Enter KNAK <span className="arrow">→</span>
            </button>
          ) : (
            <div className="w-56">
              <p className="eyebrow text-ivory/60">Preparing your table · {Math.round(progress)}%</p>
              <div className="mt-3 h-px w-full bg-ivory/15">
                <div className="h-px bg-champagne transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <motion.footer {...rise(1.3)} className="eyebrow flex flex-wrap gap-x-8 gap-y-2 text-[10px] text-ivory/45">
        {isTouch ? (
          <>
            <span>Left thumb · Walk</span>
            <span>Right thumb · Look</span>
            <span>Tap a prompt · Interact</span>
          </>
        ) : (
          <>
            <span>W A S D · Walk</span>
            <span>Mouse · Look</span>
            <span>E · Interact</span>
            <span>Shift · Stroll faster</span>
            <span>Esc · Release the mouse</span>
          </>
        )}
      </motion.footer>
    </motion.div>
  );
}
