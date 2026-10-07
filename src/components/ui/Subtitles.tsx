"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { Reveal } from "./Reveal";

/** What staff say, set like film subtitles: no box, just the speaker's name and the line. */
export default function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[30vh] z-20 flex justify-center px-6 sm:bottom-[28vh]">
      <AnimatePresence>
        {sub && (
          <motion.div
            key={sub.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl text-center [text-shadow:0_1px_12px_rgba(0,0,0,0.75)]"
          >
            <p className="eyebrow text-champagne">{sub.speaker}</p>
            {/* Words appear at roughly speaking pace. */}
            <p className="mt-2 font-display text-lg italic leading-relaxed text-ivory sm:text-xl">
              <Reveal text={sub.text} stagger={0.12} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
