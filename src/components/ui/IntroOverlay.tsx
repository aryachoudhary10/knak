"use client";

/** Letterbox bars and a title card while the camera glides in from the street. */
export default function IntroOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <div className="absolute inset-x-0 top-0 h-[11vh] animate-[slideDown_1.2s_ease-out] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[11vh] animate-[slideUp_1.2s_ease-out] bg-black" />
      <div className="absolute inset-x-0 top-[30%] flex flex-col items-center opacity-0 animate-[titleIn_7.5s_ease-in-out_0.6s_forwards]">
        <p className="font-display text-6xl font-semibold tracking-[0.45em] text-[#ecd08a] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)] sm:text-7xl">KNAK</p>
        <p className="mt-2 font-display text-xl italic tracking-wide text-[#f6efe2] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">Grand café · Bonsoir</p>
      </div>
      <p className="absolute inset-x-0 bottom-[3.5vh] text-center text-xs uppercase tracking-[0.3em] text-white/60">Click or press any key to skip</p>
    </div>
  );
}
