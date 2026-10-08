"use client";

import { useProgress } from "@react-three/drei";
import { useState } from "react";
import { motion } from "motion/react";
import { useGame } from "@/game/store";
import { portrait, useLook } from "@/game/look";
import { requestLook } from "@/components/game/Experience";
import { startAudio, unlockSpeech } from "@/game/audio";
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
  const look = useLook((s) => s.look);
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
    unlockSpeech();
    // Load voices early so the first greeting has a good one.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
    enter();
    requestAnimationFrame(() => requestLook());
  };

  const first = known ? profile!.name.trim().split(/\s+/)[0] : character.name;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.4, ease: EASE } }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-30 isolate flex flex-col items-center overflow-hidden px-8 py-8 text-center text-ivory sm:px-14 sm:py-12"
    >
      {/* Ink covers the street until every part of KNAK is ready, then lifts slowly to show it live behind the card. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: ready ? 0 : 1 }}
        transition={{ duration: 3.2, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none absolute inset-0 -z-10 bg-ink"
      />
      {/* An even veil over the street, deeper at the edges, so the centred type always reads. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-ink/60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(14,11,9,0)_35%,rgba(14,11,9,0.7)_100%)]"
      />

      {/* The edge of a printed invitation: a double hairline frame. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
        className="pointer-events-none absolute inset-3 border border-champagne/30 sm:inset-6"
      >
        <div className="absolute inset-[5px] border border-champagne/15" />
      </motion.div>

      <motion.header
        {...rise(0.4)}
        className="relative flex w-full items-center justify-between"
      >
        <p className="eyebrow text-[9px] text-ivory/55">Grand Café</p>
        {auth === "signedOut" && (
          <button
            onClick={() => openAuth("invite")}
            className="text-action text-[9px] text-ivory/80 hover:text-ivory"
          >
            Sign in
          </button>
        )}
        {auth === "signedIn" && (
          <button
            onClick={() => openAuth("address")}
            className="text-action text-[9px] text-ivory/70 hover:text-ivory"
          >
            Your details
          </button>
        )}
      </motion.header>

      <main className="flex w-full flex-1 flex-col items-center justify-center py-6">
        <motion.p {...rise(0.3)} className="eyebrow text-[10px] text-champagne">
          {known ? "Welcome back" : "You are invited"}
        </motion.p>
        {/* The name rises letter by letter (opacity and transform only, so it stays smooth while the room loads). */}
        <h1
          aria-label="KNAK"
          className="mt-6 whitespace-nowrap pl-[0.3em] font-display text-[68px] font-normal leading-none tracking-[0.3em] sm:text-[96px]"
        >
          {"KNAK".split("").map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.6, ease: EASE, delay: 0.45 + i * 0.2 }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          {...rise(1.4)}
          className="mt-6 max-w-[17rem] font-display text-[17px] italic leading-snug text-ivory/75 sm:max-w-none sm:text-xl"
        >
          A Parisian grand café, brought to your door.
        </motion.p>

        {/* line, lozenge, line */}
        <motion.div
          {...rise(1.7)}
          aria-hidden
          className="mt-8 flex items-center gap-3"
        >
          <span className="h-px w-14 bg-champagne/50" />
          <span className="h-[5px] w-[5px] rotate-45 border border-champagne/80" />
          <span className="h-px w-14 bg-champagne/50" />
        </motion.div>

        <motion.div {...rise(1.95)} className="mt-8 flex flex-col items-center">
          <button
            onClick={() => useLook.setState({ picker: true })}
            aria-label="Choose your character"
            className="h-[64px] w-[64px] cursor-pointer overflow-hidden rounded-full border border-champagne/50 transition-colors duration-500 hover:border-champagne"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait(look)} alt="" className="h-full w-full scale-[1.35] object-cover object-[50%_18%]" />
          </button>
          <p className="mt-4 font-display text-[26px] leading-none">{first}</p>
          <p className="eyebrow mt-3 text-[9px] text-ivory/45">
            {known ? "Your table is ready" : "This evening’s guest"}
          </p>
          <button
            onClick={() => useLook.setState({ picker: true })}
            className="text-action mt-4 text-[9px] text-ivory/60 hover:text-ivory"
          >
            Choose your character
          </button>
        </motion.div>

        <motion.div
          {...rise(2.25)}
          className="mt-9 flex h-14 items-center justify-center"
        >
          {ready ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              onClick={go}
              className="border border-ivory/45 px-10 py-4 pl-[calc(2.5rem+0.42em)] font-sans text-[11px] uppercase tracking-[0.42em] text-ivory transition-colors duration-500 hover:border-ivory hover:bg-ivory hover:text-ink"
            >
              Enter KNAK
            </motion.button>
          ) : (
            <div className="flex w-52 flex-col items-center">
              <p className="eyebrow text-[9px] text-ivory/55">
                Preparing your table · {Math.round(shown)}%
              </p>
              <div className="mt-3 h-px w-full bg-ivory/15">
                <div
                  className="h-px origin-left bg-champagne transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${shown / 100})` }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <motion.footer
        {...rise(2.6)}
        className="eyebrow relative flex max-w-xs flex-wrap justify-center gap-x-5 gap-y-1.5 text-[8.5px] text-ivory/40 sm:max-w-none"
      >
        {isTouch ? (
          <>
            <span>Left thumb · walk</span>
            <span>Right thumb · look</span>
            <span>Tap a prompt · interact</span>
          </>
        ) : (
          <>
            <span>W A S D · walk</span>
            <span>Mouse · look</span>
            <span>E · interact</span>
            <span>Shift · stroll faster</span>
          </>
        )}
      </motion.footer>
    </motion.div>
  );
}
