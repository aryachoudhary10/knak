import type { Character } from "@/lib/character";

/** Flat portrait of the visitor's random character, used on the welcome card and HUD. */
export default function Avatar({ c, size = 120 }: { c: Character; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label={`${c.name}'s character`}>
      <circle cx="60" cy="60" r="58" fill="#e9e2d6" stroke="#c4b08c" strokeWidth="1.5" />
      <clipPath id={`clip-${c.name}`}>
        <circle cx="60" cy="60" r="57" />
      </clipPath>
      <g clipPath={`url(#clip-${c.name})`}>
        <path d="M18 120 C 20 88, 40 78, 60 78 C 80 78, 100 88, 102 120 Z" fill={c.top} />
        <rect x="53" y="64" width="14" height="16" rx="5" fill={c.skin} />
        {c.hairStyle === "long" && <rect x="34" y="40" width="52" height="46" rx="16" fill={c.hair} />}
        <ellipse cx="60" cy="50" rx="21" ry="24" fill={c.skin} />
        {c.hairStyle !== "none" && <path d="M38 48 C 38 24, 82 24, 82 48 C 76 36, 46 34, 38 48 Z" fill={c.hair} />}
        {c.hairStyle === "bun" && <circle cx="60" cy="24" r="9" fill={c.hair} />}
        <circle cx="52" cy="52" r="2.2" fill="#2a1d14" />
        <circle cx="68" cy="52" r="2.2" fill="#2a1d14" />
        <path d="M54 62 Q 60 66 66 62" stroke="#7a3a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
