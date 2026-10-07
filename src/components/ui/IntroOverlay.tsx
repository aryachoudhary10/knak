"use client";

/** Slim letterbox and a single quiet caption while the camera crosses the road; the building's own sign does the rest. */
export default function IntroOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <div className="absolute inset-x-0 top-0 h-[6vh] animate-[slideDown_1.2s_var(--ease-house)] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[6vh] animate-[slideUp_1.2s_var(--ease-house)] bg-black" />
      <div className="absolute bottom-[10vh] left-[6vw] opacity-0 animate-[captionIn_6.5s_ease-in-out_1.2s_forwards] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
        <p className="eyebrow text-champagne">Welcome to KNAK</p>
        <p className="mt-2 font-display text-2xl italic text-ivory">Namaste.</p>
      </div>
      <p className="eyebrow absolute inset-x-0 top-[calc(6vh+14px)] text-center text-[10px] text-ivory/45">Press any key to skip</p>
    </div>
  );
}
