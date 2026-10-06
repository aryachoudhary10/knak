"use client";

import { useGame } from "@/game/store";
import { interact } from "@/components/game/Player";
import Avatar from "./Avatar";

export default function Hud() {
  const prompt = useGame((s) => s.prompt);
  const isTouch = useGame((s) => s.isTouch);
  const locked = useGame((s) => s.pointerLocked);
  const menuOpen = useGame((s) => s.menuOpen);
  const character = useGame((s) => s.character);
  const cartCount = useGame((s) => s.cart.reduce((n, l) => n + l.qty, 0));
  const openMenu = useGame((s) => s.openMenu);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* top bar */}
      <div className="flex items-start justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-full border border-[#c9a24a]/50 bg-[#1c1410]/70 py-1 pl-1 pr-4 backdrop-blur">
          <Avatar c={character} size={32} />
          <span className="font-display text-lg tracking-[0.3em] text-[#e6c77a]">KNAK</span>
        </div>
        {cartCount > 0 && (
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              openMenu();
            }}
            className="pointer-events-auto rounded-full border border-[#c9a24a]/60 bg-[#6e1a24]/90 px-4 py-2 text-sm text-[#f6efe2] shadow-lg"
          >
            Your order · {cartCount}
          </button>
        )}
      </div>

      {/* crosshair */}
      {!isTouch && !menuOpen && (
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6efe2]/80 shadow" />
      )}

      {/* interaction prompt */}
      {prompt && !menuOpen && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center sm:bottom-24">
          {isTouch ? (
            <button
              onClick={interact}
              className="pointer-events-auto rounded-full border-2 border-[#e6c77a] bg-[#6e1a24]/90 px-6 py-3 font-display text-lg text-[#f6efe2] shadow-xl active:scale-95"
            >
              {prompt.label}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-[#c9a24a]/60 bg-[#1c1410]/80 px-4 py-2 text-[#f6efe2] backdrop-blur">
              <kbd className="rounded border border-[#e6c77a] px-2 font-sans text-sm text-[#e6c77a]">E</kbd>
              <span className="font-display text-lg">{prompt.label}</span>
            </div>
          )}
        </div>
      )}

      {!isTouch && !locked && !menuOpen && (
        <div className="absolute inset-x-0 top-1/2 mt-8 flex justify-center">
          <p className="rounded-full bg-[#1c1410]/70 px-4 py-1.5 text-sm text-[#f6efe2]/90">Click to look around</p>
        </div>
      )}
    </div>
  );
}
