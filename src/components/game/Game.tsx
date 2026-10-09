"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-ink">
      <p className="font-display text-3xl tracking-[0.5em] text-ivory/80">KNAK</p>
    </div>
  ),
});

/** Form fields keep their own copy, paste and long-press menu; everywhere else in the café they're turned off. */
function isField(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");
}

export default function Game() {
  useEffect(() => {
    const block = (e: Event) => {
      if (!isField(e.target)) e.preventDefault();
    };
    const events = ["copy", "cut", "contextmenu", "selectstart", "dragstart"] as const;
    for (const ev of events) document.addEventListener(ev, block);
    return () => {
      for (const ev of events) document.removeEventListener(ev, block);
    };
  }, []);
  return <Experience />;
}
