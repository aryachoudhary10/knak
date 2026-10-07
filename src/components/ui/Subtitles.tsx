"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { Reveal } from "./Reveal";

/**
 * What staff say, held just above the speaker's head and following them on screen (SpeechTracker moves it every
 * frame). No box: the speaker's name, the line, and a hairline down to the person.
 */
export default function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  return (
    <div
      ref={(el) => {
        runtime.speechEl = el;
      }}
      className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-300 will-change-transform"
    >
      <AnimatePresence>
        {sub && (
          <motion.div
            key={sub.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-0 flex w-[min(72vw,300px)] -translate-x-1/2 flex-col items-center text-center [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] sm:w-[340px]"
          >
            <p className="eyebrow text-[9px] text-champagne">{sub.speaker}</p>
            {/* Words appear at roughly speaking pace. */}
            <p className="mt-1.5 font-display text-[15px] italic leading-snug text-ivory sm:text-lg">
              <Reveal text={sub.text} stagger={0.12} />
            </p>
            <span className="mt-2 h-5 w-px bg-ivory/45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
