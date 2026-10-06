"use client";

import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#120d0a]">
      <p className="font-display text-5xl tracking-[0.35em] text-[#c9a24a]">KNAK</p>
    </div>
  ),
});

export default function Game() {
  return <Experience />;
}
