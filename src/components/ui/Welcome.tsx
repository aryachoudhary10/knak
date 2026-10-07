"use client";

import { useProgress } from "@react-three/drei";
import { useState } from "react";
import { motion } from "motion/react";
import { useGame } from "@/game/store";
import Avatar from "./Avatar";
import { requestLook } from "@/components/game/Experience";
import { startAudio } from "@/game/audio";
import { useAuth } from "@/game/auth";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.2, delay, ease: EASE },
});

/** The invitation: a quiet card of type over the live street in front of KNAK, not a login screen. */
export default function Welcome() {
  const character = useGame((s) => s.character);
  const reroll = useGame((s) => s.rerollCharacter);
  const enter = useGame((s) => s.enter);
  const isTouch = useGame((s) => s.isTouch);
  const { active, progress } = useProgress();
  const warm = useGame((s) => s.warm);
  const ready = (!active || progress >= 100) && warm;
  // One number for the text and the bar; it never runs backwards when more files join the queue.
  const [peak, setPeak] = useState(0);
  const raw = warm ? 100 : Math.min(progress, 96);
  if (raw > peak) setPeak(raw);
  const shown = Math.max(peak, raw);
  const auth = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const openAuth = useAuth((s) => s.open);
  const known = auth === "signedIn" && !!profile?.name;

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
      exit={{ opacity: 0, transition: { duration: 1.4, ease: EASE } }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-30 isolate flex flex-col overflow-hidden px-6 py-6 text-ivory sm:px-14 sm:py-10"
    >
      {/* Ink covers the street until every part of KNAK is ready, then lifts slowly to show it live behind the type. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: ready ? 0 : 1 }}
        transition={{ duration: 3.2, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none absolute inset-0 -z-10 bg-ink"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 3.2, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(0deg,rgba(14,11,9,0.85)_0%,rgba(14,11,9,0.55)_55%,rgba(14,11,9,0.3)_100%)] sm:bg-[linear-gradient(90deg,rgba(14,11,9,0.85)_0%,rgba(14,11,9,0.5)_40%,rgba(14,11,9,0.08)_80%,rgba(14,11,9,0)_100%)]"
      />
      <header className="flex items-center justify-between">
        <p className="font-display text-[15px] tracking-[0.5em] text-ivory/80">KNAK</p>
        {auth === "signedOut" && (
          <button onClick={() => openAuth("invite")} className="text-action text-[10px] text-ivory/80 hover:text-ivory">
            Sign in <span className="arrow">→</span>
          </button>
        )}
        {auth === "signedIn" && (
          <button onClick={() => openAuth("address")} className="text-action text-[10px] text-ivory/60 hover:text-ivory">
            {profile?.name ? profile.name.split(" ")[0] : "Your details"}
          </button>
        )}
        {(auth === "off" || auth === "loading") && <p className="eyebrow hidden text-ivory/50 sm:block">Grand Café · Paris</p>}
      </header>

      <main className="flex flex-1 flex-col justify-center sm:max-w-xl">
        <motion.p {...rise(0.2)} className="eyebrow text-champagne">
          An invitation
        </motion.p>
        {/* The name rises letter by letter (opacity and transform only, so it stays smooth while the room loads). */}
        <h1 aria-label="KNAK" className="mt-6 font-display text-[64px] font-normal leading-none tracking-[0.28em] sm:text-[104px]">
          {"KNAK".split("").map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.6, ease: EASE, delay: 0.35 + i * 0.22 }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p {...rise(1.5)} className="mt-5 font-display text-lg italic text-ivory/75 sm:text-xl">
          A grand café of Paris, brought to your door.
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 1.8 }}
          className="mt-12 h-px w-12 origin-left bg-champagne/60"
        />

        <motion.div {...rise(2.1)} className="mt-10">
          <p className="eyebrow text-ivory/50">{known ? "Welcome back" : "This evening’s guest"}</p>
          <div className="mt-4 flex items-center gap-5">
            <Avatar c={character} size={52} />
            <div>
              <p className="font-display text-2xl">{known ? profile!.name.split(" ")[0] : character.name}</p>
              <button onClick={reroll} className="text-action mt-1 text-[10px] text-ivory/60 hover:text-ivory">
                Change appearance
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div {...rise(2.4)} className="mt-14">
          {ready ? (
            <button onClick={go} className="text-action text-[13px] text-ivory">
              Enter KNAK <span className="arrow">→</span>
            </button>
          ) : (
            <div className="w-56">
              <p className="eyebrow text-ivory/60">Preparing your table · {Math.round(shown)}%</p>
              <div className="mt-3 h-px w-full bg-ivory/15">
                <div className="h-px origin-left bg-champagne transition-transform duration-500 ease-out" style={{ transform: `scaleX(${shown / 100})` }} />
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <motion.footer {...rise(2.7)} className="eyebrow flex flex-wrap gap-x-8 gap-y-2 text-[10px] text-ivory/45">
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
