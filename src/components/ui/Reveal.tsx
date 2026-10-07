"use client";

import { motion } from "motion/react";

/** Fades text in piece by piece (letters or words), with the plain text kept for screen readers. */
export function Reveal({ text, per = "word", stagger = 0.06, delay = 0, className }: { text: string; per?: "char" | "word"; stagger?: number; delay?: number; className?: string }) {
  const parts = per === "char" ? Array.from(text) : text.split(/(\s+)/);
  let n = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {parts.map((p, i) =>
        /^\s+$/.test(p) ? (
          <span key={i} aria-hidden>
            {p}
          </span>
        ) : (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: delay + n++ * stagger }}
          >
            {p}
          </motion.span>
        ),
      )}
    </span>
  );
}
