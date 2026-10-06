export type Character = {
  name: string;
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "bun" | "none";
  top: string;
  bottom: string;
};

const SKINS = ["#f1d3b8", "#e2b48f", "#c98e64", "#a86d45", "#8a5534", "#5f3a22"];
const HAIRS = ["#1d1410", "#3b2416", "#6b4423", "#a87a4a", "#d8c08a", "#8a8a8a"];
const TOPS = ["#7b1f2a", "#1f3a5f", "#2f4a3a", "#e9e2d0", "#2b2b2b", "#b88a3b", "#5d3a6b", "#c46a4a"];
const BOTTOMS = ["#1f1f24", "#3a3f4a", "#5a4a3a", "#e8e0cc", "#2a3550"];
const STYLES: Character["hairStyle"][] = ["short", "long", "bun", "none"];
const NAMES = [
  "Aarav", "Anaya", "Kabir", "Meera", "Rohan", "Isha", "Vihaan", "Zoya", "Arjun", "Diya",
  "Neel", "Tara", "Kiaan", "Saanvi", "Reyansh", "Myra", "Advik", "Aditi", "Ira", "Dev",
];

/** Deterministic PRNG so background guests look the same on every visit. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function randomCharacter(rnd: () => number = Math.random): Character {
  return {
    name: pick(NAMES, rnd),
    skin: pick(SKINS, rnd),
    hair: pick(HAIRS, rnd),
    hairStyle: pick(STYLES, rnd),
    top: pick(TOPS, rnd),
    bottom: pick(BOTTOMS, rnd),
  };
}
