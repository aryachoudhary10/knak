"use client";

import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-ink">
      <p className="font-display text-3xl tracking-[0.5em] text-ivory/80">KNAK</p>
    </div>
  ),
});

export default function Game() {
  return <Experience />;
}
