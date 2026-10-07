"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { CATEGORIES, MENU, formatINR, menuById, type MenuItem } from "@/data/menu";
import { requestLook } from "@/components/game/Experience";
import { profileComplete, useAuth } from "@/game/auth";

const EASE = [0.22, 1, 0.36, 1] as const;
const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.4, ease: EASE },
};

type View = { name: "carte" } | { name: "dish"; id: string } | { name: "table" } | { name: "sent"; ref: string; to: string | null };

export default function MenuCard() {
  const open = useGame((s) => s.menuOpen);
  return <AnimatePresence>{open && <Carte key="menu" />}</AnimatePresence>;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Indian food-safety mark, kept small and quiet: a hairline square with a dot. */
function DietMark({ veg }: { veg: boolean }) {
  return (
    <span title={veg ? "Vegetarian" : "Non-vegetarian"} className={`inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center border ${veg ? "border-[#3f6b3a]" : "border-bordeaux"}`}>
      <span className={`h-1 w-1 rounded-full ${veg ? "bg-[#3f6b3a]" : "bg-bordeaux"}`} />
    </span>
  );
}

/** Until the owner's photography arrives: a drawn place setting on near-black, captioned like a contact sheet. */
function DishImage({ item }: { item: MenuItem }) {
  if (item.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.image} alt={item.name} className="h-full w-full object-cover" />;
  }
  const drink = item.category === "Drinks";
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-ink text-ivory/70">
      <svg viewBox="0 0 200 200" className="w-[58%]" fill="none" stroke="currentColor" strokeWidth="0.8">
        {drink ? (
          <>
            <ellipse cx="100" cy="150" rx="62" ry="16" opacity="0.5" />
            <path d="M68 70 h64 l-6 72 a6 6 0 0 1 -6 5 h-40 a6 6 0 0 1 -6 -5 z" />
            <ellipse cx="100" cy="70" rx="32" ry="7" />
            <path d="M132 86 c22 0 22 30 -2 30" />
          </>
        ) : (
          <>
            <ellipse cx="100" cy="112" rx="88" ry="38" />
            <ellipse cx="100" cy="112" rx="60" ry="25" opacity="0.6" />
            <path d="M74 108 c8 -16 44 -18 54 -2 c4 7 -6 14 -27 14 c-20 0 -31 -5 -27 -12z" opacity="0.9" />
            <path d="M14 150 l2 -70 M24 150 l-1 -70" opacity="0.5" />
            <path d="M184 150 l-2 -72 c6 4 8 20 0 26" opacity="0.5" />
          </>
        )}
      </svg>
      <p className="eyebrow absolute bottom-5 left-6 text-[9px] text-ivory/40">Photograph to follow</p>
    </div>
  );
}

function Carte() {
  const close = useGame((s) => s.closeMenu);
  const cart = useGame((s) => s.cart);
  const clearCart = useGame((s) => s.clearCart);
  const [view, setView] = useState<View>({ name: "carte" });
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);

  const total = cart.reduce((s, l) => s + (menuById[l.itemId]?.price ?? 0) * l.qty, 0);
  const dishes = cart.reduce((n, l) => n + l.qty, 0);
  const done = () => {
    close();
    requestAnimationFrame(() => requestLook());
  };
  const complete = () => {
    const auth = useAuth.getState();
    // Orders go to a door, so a guest signs in and leaves an address first (unless sign-in isn't set up yet).
    if (auth.status !== "off" && (auth.status !== "signedIn" || !profileComplete(auth.profile))) {
      auth.open("order");
      return;
    }
    const p = auth.profile;
    clearCart();
    setView({ name: "sent", ref: String(1000 + Math.floor(Math.random() * 9000)), to: p ? `${p.address}, ${p.pincode}` : null });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-20 flex items-stretch justify-center bg-ink/65 sm:items-center sm:p-8"
      onClick={done}
    >
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.5, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[780px] flex-col bg-paper text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:h-[min(90vh,880px)]"
      >
        <button onClick={done} className="text-action absolute right-6 top-6 z-10 text-[10px] text-stone hover:text-ink sm:right-10 sm:top-8">
          Close
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {view.name === "carte" && (
            <motion.div key="carte" {...swap} className="flex min-h-0 flex-1 flex-col">
              <header className="px-6 pt-14 text-center sm:px-16 sm:pt-16">
                <p className="eyebrow text-stone">La Carte</p>
                <p className="mt-4 font-display text-[34px] leading-none tracking-[0.45em] sm:text-[40px]">KNAK</p>
                <p className="mt-3 font-display text-base italic text-stone">Served this evening, delivered to your door</p>
                <nav className="mt-10 flex justify-center gap-6 sm:gap-10">
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => setCat(c)} className={`eyebrow relative cursor-pointer pb-2 transition-colors duration-300 ${cat === c ? "text-ink" : "text-stone hover:text-ink"}`}>
                      {c}
                      {cat === c && <motion.span layoutId="carte-underline" transition={{ duration: 0.35, ease: EASE }} className="absolute inset-x-0 bottom-0 h-px bg-bordeaux" />}
                    </button>
                  ))}
                </nav>
              </header>

              <div className="mt-8 min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-16">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.ul key={cat} {...swap} className="divide-y divide-ink/10 border-t border-ink/10">
                    {MENU.filter((m) => m.category === cat).map((m) => (
                      <DishRow key={m.id} item={m} onOpen={() => setView({ name: "dish", id: m.id })} />
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </div>

              <TableBar dishes={dishes} total={total} onView={() => setView({ name: "table" })} />
            </motion.div>
          )}

          {view.name === "dish" && (
            <motion.div key={`dish-${view.id}`} {...swap} className="flex min-h-0 flex-1 flex-col">
              <DishView item={menuById[view.id]} onBack={() => setView({ name: "carte" })} onTable={() => setView({ name: "table" })} />
            </motion.div>
          )}

          {view.name === "table" && (
            <motion.div key="table" {...swap} className="flex min-h-0 flex-1 flex-col">
              <TableView total={total} onBack={() => setView({ name: "carte" })} onComplete={complete} />
            </motion.div>
          )}

          {view.name === "sent" && (
            <motion.div key="sent" {...swap} className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <p className="eyebrow text-stone">Order No. {view.ref}</p>
              <p className="mt-6 font-display text-6xl italic">Merci.</p>
              <p className="mt-6 max-w-sm font-display text-lg leading-relaxed text-ink/80">Your table’s order is with the kitchen. We will let you know the moment it leaves for your door.</p>
              {view.to && <p className="mt-4 max-w-sm font-sans text-[12px] font-light leading-relaxed text-stone">Delivering to {view.to}</p>}
              <p className="eyebrow mt-10 text-[9px] text-stone">Preview · delivery details and payment arrive in the next phase</p>
              <button onClick={done} className="text-action mt-12 text-ink">
                Return to the room <span className="arrow">→</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </motion.div>
  );
}

function DishRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const qty = useGame((s) => s.cart.find((l) => l.itemId === item.id)?.qty ?? 0);
  const add = useGame((s) => s.addToCart);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className={`group grid cursor-pointer grid-cols-[1fr_auto] items-baseline gap-x-6 py-6 outline-none ${item.available ? "" : "opacity-45"}`}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-3">
            <DietMark veg={item.veg} />
            <span className="font-display text-[17px] uppercase tracking-[0.14em] transition-colors duration-300 group-hover:text-bordeaux sm:text-[19px]">{item.name}</span>
            {qty > 0 && <span className="font-sans text-xs tracking-widest text-bordeaux">× {qty}</span>}
          </p>
          <p className="mt-2 pl-[22px] font-sans text-[13px] font-light tracking-wide text-stone">{item.available ? item.description : "Unavailable this evening"}</p>
        </div>
        <div className="flex items-baseline gap-5">
          {item.available && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                add(item.id);
              }}
              className="text-action pointer-events-none text-[10px] text-bordeaux opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:hidden"
            >
              Add
            </button>
          )}
          <p className="font-sans text-[14px] tabular-nums tracking-wide">{formatINR(item.price)}</p>
        </div>
      </div>
    </li>
  );
}

function Qty({ value, onLess, onMore, name }: { value: number; onLess: () => void; onMore: () => void; name: string }) {
  return (
    <span className="inline-flex items-center gap-4 font-sans text-sm tabular-nums">
      <button onClick={onLess} aria-label={`One fewer ${name}`} className="cursor-pointer px-1 text-stone transition-colors hover:text-ink">
        −
      </button>
      <span className="w-4 text-center">{value}</span>
      <button onClick={onMore} aria-label={`One more ${name}`} className="cursor-pointer px-1 text-stone transition-colors hover:text-ink">
        +
      </button>
    </span>
  );
}

function DishView({ item, onBack, onTable }: { item: MenuItem; onBack: () => void; onTable: () => void }) {
  const add = useGame((s) => s.addToCart);
  const inCart = useGame((s) => s.cart.find((l) => l.itemId === item.id)?.qty ?? 0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row sm:overflow-hidden">
      <div className="aspect-[4/3] w-full shrink-0 sm:aspect-auto sm:h-full sm:w-[46%]">
        <DishImage item={item} />
      </div>
      <div className="flex flex-1 flex-col px-6 pb-10 pt-8 sm:px-12 sm:pt-16">
        <button onClick={onBack} className="text-action self-start text-[10px] text-stone hover:text-ink">
          <span className="arrow">←</span> La Carte
        </button>
        <p className="eyebrow mt-12 text-stone">{item.category}</p>
        <h2 className="mt-4 font-display text-[34px] uppercase leading-[1.1] tracking-[0.08em] sm:text-[40px]">{item.name}</h2>
        <p className="mt-5 font-sans text-[14px] font-light tracking-wide text-stone">{item.description}</p>
        <p className="mt-8 font-sans text-lg tabular-nums">{formatINR(item.price)}</p>
        <div className="mt-auto pt-12">
          {item.available ? (
            <>
              <div className="flex items-center justify-between border-t border-ink/10 pt-6">
                <Qty value={qty} name={item.name} onLess={() => setQty((q) => Math.max(1, q - 1))} onMore={() => setQty((q) => Math.min(9, q + 1))} />
                <button
                  onClick={() => {
                    for (let i = 0; i < qty; i++) add(item.id);
                    setAdded(true);
                    setQty(1);
                  }}
                  className="text-action text-bordeaux"
                >
                  Add to table <span className="arrow">→</span>
                </button>
              </div>
              <AnimatePresence>
                {added && inCart > 0 && (
                  <motion.div {...swap} className="mt-6 flex items-baseline justify-between">
                    <p className="font-sans text-xs tracking-widest text-stone">{count(inCart, "on your table", "on your table")}</p>
                    <button onClick={onTable} className="text-action text-[10px] text-ink">
                      View your table <span className="arrow">→</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <p className="eyebrow text-stone">Unavailable this evening</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TableBar({ dishes, total, onView }: { dishes: number; total: number; onView: () => void }) {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-ink/10 px-6 py-5 sm:px-16">
      <div>
        <p className="eyebrow text-stone">Your table</p>
        <p className="mt-1.5 font-sans text-sm tabular-nums tracking-wide">{dishes === 0 ? "Nothing yet" : `${count(dishes, "dish", "dishes")} · ${formatINR(total)}`}</p>
      </div>
      <button onClick={onView} disabled={dishes === 0} className="text-action text-ink">
        View your table <span className="arrow">→</span>
      </button>
    </footer>
  );
}

function TableView({ total, onBack, onComplete }: { total: number; onBack: () => void; onComplete: () => void }) {
  const cart = useGame((s) => s.cart);
  const add = useGame((s) => s.addToCart);
  const remove = useGame((s) => s.removeFromCart);
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pt-8 sm:px-16 sm:pt-12">
      <button onClick={onBack} className="text-action self-start text-[10px] text-stone hover:text-ink">
        <span className="arrow">←</span> La Carte
      </button>
      <p className="eyebrow mt-10 text-stone">This evening</p>
      <h2 className="mt-4 font-display text-[38px] italic leading-none">Your table</h2>
      <ul className="mt-10 min-h-0 flex-1 divide-y divide-ink/10 overflow-y-auto border-t border-ink/10">
        {cart.length === 0 && <li className="py-6 font-display text-lg italic text-stone">Your table is waiting for its first dish.</li>}
        {cart.map((l) => {
          const m = menuById[l.itemId];
          if (!m) return null;
          return (
            <li key={l.itemId} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-8 py-5">
              <span className="font-display text-[16px] uppercase tracking-[0.12em]">{m.name}</span>
              <Qty value={l.qty} name={m.name} onLess={() => remove(m.id)} onMore={() => add(m.id)} />
              <span className="w-20 text-right font-sans text-sm tabular-nums">{formatINR(m.price * l.qty)}</span>
            </li>
          );
        })}
      </ul>
      <footer className="border-t border-ink/10 py-6">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-stone">Total</p>
          <p className="font-sans text-lg tabular-nums">{formatINR(total)}</p>
        </div>
        <DeliverTo />
        <div className="mt-8 flex items-center justify-between gap-6">
          <p className="max-w-[16rem] font-sans text-[11px] font-light leading-relaxed text-stone">Prepared fresh and delivered hot. Payment follows.</p>
          <button onClick={onComplete} disabled={cart.length === 0} className="text-action text-bordeaux">
            Complete order <span className="arrow">→</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

/** Where the order will go, with a quiet way to change it for this order and the next. */
function DeliverTo() {
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const open = useAuth((s) => s.open);
  if (status !== "signedIn" || !profileComplete(profile)) return null;
  return (
    <div className="mt-6 flex items-baseline justify-between gap-6">
      <div className="min-w-0">
        <p className="eyebrow text-stone">Deliver to</p>
        <p className="mt-2 truncate font-sans text-[12px] text-ink/80">
          {profile.name} · {profile.address}, {profile.pincode}
        </p>
      </div>
      <button onClick={() => open("address")} className="text-action shrink-0 text-[10px] text-stone hover:text-ink">
        Change
      </button>
    </div>
  );
}
