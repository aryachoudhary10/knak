import { create } from "zustand";
import type { Character } from "@/lib/character";
import { randomCharacter } from "@/lib/character";

export type Prompt =
  | { kind: "sit"; chairId: string; label: string }
  | { kind: "stand"; label: string }
  | { kind: "order"; label: string }
  | null;

export type CartLine = { itemId: string; qty: number };

type GameState = {
  phase: "welcome" | "playing";
  character: Character;
  /** Joystick or keyboard intent, x = strafe right, y = forward. Range -1..1. */
  move: { x: number; y: number };
  running: boolean;
  /** Camera orientation in radians. */
  yaw: number;
  pitch: number;
  prompt: Prompt;
  seatedChairId: string | null;
  menuOpen: boolean;
  cart: CartLine[];
  isTouch: boolean;
  pointerLocked: boolean;
  /** The cinematic glide from the street to the door is playing. */
  intro: boolean;
  subtitle: { speaker: string; text: string } | null;
  soundOn: boolean;

  rerollCharacter: () => void;
  enter: () => void;
  setMove: (x: number, y: number) => void;
  setRunning: (running: boolean) => void;
  look: (dx: number, dy: number) => void;
  setPrompt: (p: Prompt) => void;
  sit: (chairId: string) => void;
  stand: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  addToCart: (itemId: string) => void;
  removeFromCart: (itemId: string) => void;
  setTouch: (isTouch: boolean) => void;
  setPointerLocked: (locked: boolean) => void;
  endIntro: () => void;
  say: (speaker: string, text: string, ms: number) => void;
  toggleSound: () => void;
};

let subtitleTimer: ReturnType<typeof setTimeout> | undefined;

const PITCH_LIMIT = Math.PI / 2.4;

export const useGame = create<GameState>((set, get) => ({
  phase: "welcome",
  character: randomCharacter(),
  move: { x: 0, y: 0 },
  running: false,
  yaw: 0,
  pitch: 0,
  prompt: null,
  seatedChairId: null,
  menuOpen: false,
  cart: [],
  isTouch: false,
  pointerLocked: false,
  intro: false,
  subtitle: null,
  soundOn: true,

  rerollCharacter: () => set({ character: randomCharacter() }),
  enter: () => set({ phase: "playing", intro: true }),
  setMove: (x, y) => {
    const m = get().move;
    if (m.x !== x || m.y !== y) set({ move: { x, y } });
  },
  setRunning: (running) => set({ running }),
  look: (dx, dy) =>
    set((s) => ({
      yaw: s.yaw - dx,
      pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, s.pitch - dy)),
    })),
  setPrompt: (p) => {
    const cur = get().prompt;
    const same =
      cur === p ||
      (cur && p && cur.kind === p.kind && cur.label === p.label &&
        (cur.kind !== "sit" || (p.kind === "sit" && cur.chairId === p.chairId)));
    if (!same) set({ prompt: p });
  },
  sit: (chairId) => set({ seatedChairId: chairId, prompt: null }),
  stand: () => set({ seatedChairId: null }),
  openMenu: () => set({ menuOpen: true, move: { x: 0, y: 0 } }),
  closeMenu: () => set({ menuOpen: false }),
  addToCart: (itemId) =>
    set((s) => {
      const line = s.cart.find((l) => l.itemId === itemId);
      if (line) return { cart: s.cart.map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + 1 } : l)) };
      return { cart: [...s.cart, { itemId, qty: 1 }] };
    }),
  removeFromCart: (itemId) =>
    set((s) => ({
      cart: s.cart
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    })),
  setTouch: (isTouch) => set({ isTouch }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  endIntro: () => set({ intro: false, yaw: 0, pitch: 0 }),
  say: (speaker, text, ms) => {
    set({ subtitle: { speaker, text } });
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => set({ subtitle: null }), ms + 800);
  },
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
