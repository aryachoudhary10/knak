"use client";

import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { runtime } from "@/game/runtime";
import { Reveal } from "./Reveal";

/** The same role lines the prompts use, so a speaker reads exactly like their label. */
const ROLE: Record<string, string> = { host: "Your host", cashier: "Maître de comptoir" };

/**
 * What staff say, set like their name labels: a dot by the speaker's head and a hairline out to the name in the
 * display serif, their role, a rule, then the line itself. PromptTracker moves it with the speaker every frame.
 */
export default function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  return (
    <div
      ref={(el) => {
        runtime.speechEl = el;
      }}
      className="group pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-300 will-change-transform"
    >
      <AnimatePresence>
        {sub && (
          <motion.div
            key={sub.text}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 flex items-start [text-shadow:0_1px_10px_rgba(0,0,0,0.6)] group-data-[flip=1]:-translate-x-full group-data-[flip=1]:flex-row-reverse"
          >
            <span className="mt-[-4px] h-[8px] w-[8px] shrink-0 -translate-x-1/2 rounded-full border border-ivory bg-ivory/90 group-data-[flip=1]:translate-x-1/2" />
            <span className="mt-0 h-px w-10 shrink-0 bg-ivory/55 sm:w-14" />
            <div className="-mt-[8px] flex w-[min(56vw,250px)] flex-col px-4 text-left group-data-[flip=1]:items-end group-data-[flip=1]:text-right sm:w-[290px]">
              <span className="font-display text-[15px] uppercase leading-none tracking-[0.16em] text-ivory sm:text-[17px]">{sub.speaker}</span>
              {ROLE[sub.who] && <span className="eyebrow mt-1.5 text-[8px] text-ivory/70">{ROLE[sub.who]}</span>}
              <span className="mt-2.5 h-px w-20 bg-ivory/30" />
              {/* Words appear at roughly speaking pace. */}
              <p className="mt-2.5 font-display text-[13px] italic leading-snug text-ivory sm:text-[15px]">
                <Reveal text={sub.text} stagger={0.12} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
