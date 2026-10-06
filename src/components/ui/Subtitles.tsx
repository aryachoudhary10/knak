"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { Reveal } from "./Reveal";

/** What staff say, shown as film-style subtitles (also covers browsers without speech). */
export default function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center px-4 sm:bottom-36">
      <AnimatePresence>
        {sub && (
          <motion.div
            key={sub.text}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="max-w-2xl rounded-xl bg-black/55 px-5 py-3 text-center text-[15px] leading-relaxed text-[#f6efe2] shadow-xl backdrop-blur-sm sm:text-base"
          >
            <span className="font-display text-lg italic text-[#ecd08a]">{sub.speaker}: </span>
            {/* Words appear at roughly speaking pace. */}
            <Reveal text={sub.text} stagger={0.12} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
