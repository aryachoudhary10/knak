"use client";

import { AnimatePresence, motion } from "motion/react";
import { chooseLook, LOOK_COUNT, portrait, useLook } from "@/game/look";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Choose the person you appear as to the other guests in KNAK. */
export default function LookPicker() {
  const open = useLook((s) => s.picker);
  const look = useLook((s) => s.look);
  const close = () => useLook.setState({ picker: false });
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-ink/80 px-5 text-ivory backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            exit={{ y: 16 }}
            transition={{ duration: 0.6, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] text-center"
          >
            <p className="eyebrow text-[9px] text-champagne">Your character</p>
            <p className="mt-4 font-display text-[24px] leading-tight sm:text-[30px]">How would you like to appear?</p>
            <p className="mt-3 font-display text-[15px] italic text-ivory/60">Other guests at KNAK will see you as this person.</p>
            <div className="mt-8 grid grid-cols-4 gap-2.5 sm:gap-4">
              {Array.from({ length: LOOK_COUNT }, (_, i) => (
                <button
                  key={i}
                  onClick={() => void chooseLook(i)}
                  aria-label={`Character ${i + 1}`}
                  aria-pressed={look === i}
                  className={`relative aspect-[3/4] cursor-pointer overflow-hidden border transition-all duration-500 ${look === i ? "border-champagne" : "border-ivory/15 opacity-70 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portrait(i)} alt="" className="h-full w-full origin-[50%_12%] scale-[1.4] object-cover" />
                  {look === i && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-champagne" />}
                </button>
              ))}
            </div>
            <button
              onClick={close}
              className="mt-9 border border-ivory/45 px-10 py-3.5 pl-[calc(2.5rem+0.42em)] font-sans text-[10px] uppercase tracking-[0.42em] transition-colors duration-500 hover:border-ivory hover:bg-ivory hover:text-ink"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
