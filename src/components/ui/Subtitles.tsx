"use client";

import { useGame } from "@/game/store";

/** What staff say, shown as film-style subtitles (also covers browsers without speech). */
export default function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  if (!sub) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center px-4 sm:bottom-36">
      <p className="max-w-2xl animate-[fadeIn_0.4s_ease-out] rounded-xl bg-black/55 px-5 py-3 text-center text-[15px] leading-relaxed text-[#f6efe2] shadow-xl backdrop-blur-sm sm:text-base">
        <span className="font-display text-lg italic text-[#ecd08a]">{sub.speaker}: </span>
        {sub.text}
      </p>
    </div>
  );
}
