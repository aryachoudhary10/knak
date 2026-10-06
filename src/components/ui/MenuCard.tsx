"use client";

import { useState } from "react";
import { useGame } from "@/game/store";
import { CATEGORIES, MENU, formatINR, menuById } from "@/data/menu";
import { requestLook } from "@/components/game/Experience";

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      title={veg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${veg ? "border-green-700" : "border-red-800"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-green-700" : "bg-red-800"}`} />
    </span>
  );
}

export default function MenuCard() {
  const open = useGame((s) => s.menuOpen);
  const close = useGame((s) => s.closeMenu);
  const cart = useGame((s) => s.cart);
  const add = useGame((s) => s.addToCart);
  const remove = useGame((s) => s.removeFromCart);
  const [cat, setCat] = useState<string>(CATEGORIES[0]);

  if (!open) return null;

  const qty = (id: string) => cart.find((l) => l.itemId === id)?.qty ?? 0;
  const total = cart.reduce((s, l) => s + (menuById[l.itemId]?.price ?? 0) * l.qty, 0);
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const done = () => {
    close();
    requestAnimationFrame(() => requestLook());
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#120d0a]/60 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={done}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-[6px] border-[#6e1a24] bg-[#f6efe2] text-[#2a1d14] shadow-2xl sm:rounded-2xl"
      >
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-[#c9a24a]/60" />
        <header className="px-6 pt-6 text-center sm:px-10">
          <button onClick={done} aria-label="Close menu" className="absolute right-4 top-3 text-2xl text-[#8f6a24] hover:text-[#6e1a24]">
            ×
          </button>
          <p className="font-display text-4xl font-semibold tracking-[0.35em] text-[#a8812f]">KNAK</p>
          <p className="font-display text-lg italic text-[#6e1a24]">La carte</p>
          <nav className="mt-4 flex justify-center gap-1 overflow-x-auto sm:gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1 font-display text-lg transition ${cat === c ? "bg-[#6e1a24] text-[#f6efe2]" : "text-[#5a4a3a] hover:text-[#6e1a24]"}`}
              >
                {c}
              </button>
            ))}
          </nav>
          <div className="mx-auto mt-4 h-px w-full bg-[#c9a24a]/50" />
        </header>

        <ul className="flex-1 space-y-4 overflow-y-auto px-6 py-5 sm:px-10">
          {MENU.filter((m) => m.category === cat).map((m) => (
            <li key={m.id} className={`flex items-start gap-3 ${m.available ? "" : "opacity-45"}`}>
              <div className="mt-1.5">
                <VegMark veg={m.veg} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-xl font-semibold">{m.name}</p>
                  <span className="flex-1 translate-y-[-4px] border-b border-dotted border-[#c9a24a]" />
                  <p className="font-display text-lg text-[#6e1a24]">{formatINR(m.price)}</p>
                </div>
                <p className="text-sm italic text-[#7a6a58]">{m.available ? m.description : "Not available today"}</p>
              </div>
              {m.available && (
                <div className="flex shrink-0 items-center gap-2 pt-1">
                  {qty(m.id) > 0 && (
                    <>
                      <button onClick={() => remove(m.id)} className="h-8 w-8 rounded-full border border-[#c9a24a] text-[#8f6a24]" aria-label={`Remove one ${m.name}`}>
                        −
                      </button>
                      <span className="w-4 text-center font-semibold">{qty(m.id)}</span>
                    </>
                  )}
                  <button onClick={() => add(m.id)} className="h-8 w-8 rounded-full bg-[#6e1a24] text-[#f6efe2]" aria-label={`Add ${m.name}`}>
                    +
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <footer className="border-t border-[#c9a24a]/50 bg-[#efe5d2] px-6 py-4 sm:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7a6a58]">{count} item{count === 1 ? "" : "s"}</p>
              <p className="font-display text-2xl text-[#2a1d14]">{formatINR(total)}</p>
            </div>
            <button
              disabled
              title="Sign in, delivery address and UPI payment arrive in the next update"
              className="rounded-full bg-[#6e1a24] px-6 py-3 font-display text-lg text-[#f6efe2] opacity-50"
            >
              Checkout soon
            </button>
          </div>
          <p className="mt-2 text-xs text-[#7a6a58]">Sample menu. Sign in, delivery and UPI payment come in the next update.</p>
        </footer>
      </div>
    </div>
  );
}
