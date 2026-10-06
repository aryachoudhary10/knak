"use client";

import { useProgress } from "@react-three/drei";
import { useGame } from "@/game/store";
import Avatar from "./Avatar";
import { requestLook } from "@/components/game/Experience";
import { startAudio } from "@/game/audio";
import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { BorderTrail } from "@/components/motion-primitives/border-trail";

export default function Welcome() {
  const character = useGame((s) => s.character);
  const reroll = useGame((s) => s.rerollCharacter);
  const enter = useGame((s) => s.enter);
  const isTouch = useGame((s) => s.isTouch);
  const { active, progress } = useProgress();
  const ready = !active || progress >= 100;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(28,20,16,0.55),rgba(18,13,10,0.92))] p-4">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="w-full max-w-md rounded-2xl border border-[#c9a24a]/50 bg-[#f6efe2] p-8 text-center text-[#2a1d14] shadow-2xl"
      >
        <h1 className="font-display text-5xl font-semibold tracking-[0.35em] text-[#a8812f]">
          <Reveal text="KNAK" per="char" stagger={0.12} delay={0.15} />
        </h1>
        <p className="mt-1 font-display text-lg italic text-[#6e1a24]">
          <Reveal text="Grand café · Home delivery" delay={0.6} />
        </p>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }} className="mx-auto my-6 h-px w-24 bg-[#c9a24a]" />
        <div className="flex flex-col items-center gap-3">
          <Avatar c={character} size={112} />
          <p className="text-sm text-[#5a4a3a]">
            Tonight you are <span className="font-semibold text-[#2a1d14]">{character.name}</span>
          </p>
          <button
            onClick={reroll}
            className="cursor-pointer rounded-full border border-[#c9a24a] px-4 py-1.5 text-xs uppercase tracking-widest text-[#8f6a24] transition hover:bg-[#c9a24a]/10"
          >
            Change my look
          </button>
        </div>
        <button
          disabled={!ready}
          onClick={() => {
            startAudio();
            // Load voices early so the first greeting has a good one.
            if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
            enter();
            requestAnimationFrame(() => requestLook());
          }}
          className="relative mt-8 w-full cursor-pointer rounded-full bg-[#6e1a24] py-3 font-display text-xl tracking-wider text-[#f6efe2] shadow-lg transition hover:bg-[#831f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24a] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          {ready && <BorderTrail size={70} className="bg-gradient-to-l from-transparent via-[#ecd08a] to-transparent" transition={{ repeat: Infinity, duration: 4, ease: "linear" }} />}
          {ready ? "Enter KNAK" : `Setting the tables… ${Math.round(progress)}%`}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-[#7a6a58]">
          {isTouch
            ? "Left thumb to walk, drag on the right to look around, tap the gold button to sit or order."
            : "W A S D to walk, mouse to look, E to sit or order, Shift to walk faster, Esc to free the mouse."}
        </p>
      </motion.div>
    </div>
  );
}
