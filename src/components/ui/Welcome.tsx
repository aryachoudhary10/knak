"use client";

import { useProgress } from "@react-three/drei";
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
  transition: { duration: 0.9, delay, ease: EASE },
});

/** The invitation: a quiet card of type over KNAK's dining room at the golden hour, not a login screen. */
export default function Welcome() {
  const character = useGame((s) => s.character);
  const reroll = useGame((s) => s.rerollCharacter);
  const enter = useGame((s) => s.enter);
  const isTouch = useGame((s) => s.isTouch);
  const { active, progress } = useProgress();
  const warm = useGame((s) => s.warm);
  const ready = (!active || progress >= 100) && warm;
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
      className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-ink px-6 py-6 text-ivory sm:px-14 sm:py-10"
    >
      {/* The dining room as it looks at its best; on Enter it dissolves into the live room behind it. */}
      <motion.img
        src="/opening.webp"
        alt=""
        aria-hidden
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ opacity: { duration: 1.6, ease: EASE }, scale: { duration: 14, ease: "linear" } }}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ink/45 sm:bg-transparent sm:bg-[linear-gradient(90deg,rgba(14,11,9,0.88)_0%,rgba(14,11,9,0.6)_38%,rgba(14,11,9,0.15)_75%,rgba(14,11,9,0.05)_100%)]" />
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
        <motion.h1 {...rise(0.35)} className="mt-6 font-display text-[64px] font-normal leading-none tracking-[0.28em] sm:text-[104px]">
          KNAK
        </motion.h1>
        <motion.p {...rise(0.55)} className="mt-5 font-display text-lg italic text-ivory/75 sm:text-xl">
          A grand café of Paris, brought to your door.
        </motion.p>

        <motion.div {...rise(0.75)} className="mt-12 h-px w-12 bg-champagne/60" />

        <motion.div {...rise(0.85)} className="mt-10">
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

        <motion.div {...rise(1.05)} className="mt-14">
          {ready ? (
            <button onClick={go} className="text-action text-[13px] text-ivory">
              Enter KNAK <span className="arrow">→</span>
            </button>
          ) : (
            <div className="w-56">
              <p className="eyebrow text-ivory/60">Preparing your table · {Math.round(warm ? 100 : Math.min(progress, 96))}%</p>
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
