import { create } from "zustand";
import type { Character } from "@/lib/character";
import { randomCharacter } from "@/lib/character";

/** A contextual prompt: who or what you are facing, a line of detail, and the action E (or a tap) takes. */
type PromptText = { title: string; meta: string; action: string };
export type Prompt =
  | ({ kind: "sit"; chairId: string } & PromptText)
  | ({ kind: "stand" } & PromptText)
  | ({ kind: "order" } & PromptText)
  | ({ kind: "speak" } & PromptText)
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
  /** Every shader in the scene has been compiled, so entering never stutters. */
  warm: boolean;
  setWarm: () => void;
  pointerLocked: boolean;
  /** The cinematic glide from the street to the door is playing. */
  intro: boolean;
  /** A line being spoken, and the id of the person saying it (shown above their head). */
  subtitle: { speaker: string; text: string; who: string } | null;
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
  clearCart: () => void;
  setTouch: (isTouch: boolean) => void;
  setPointerLocked: (locked: boolean) => void;
  endIntro: () => void;
  say: (who: string, speaker: string, text: string, ms: number) => void;
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
  warm: false,
  setWarm: () => set({ warm: true }),
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
      (cur && p && cur.kind === p.kind && cur.title === p.title && cur.meta === p.meta && cur.action === p.action);
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
  clearCart: () => set({ cart: [] }),
  setTouch: (isTouch) => set({ isTouch }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  endIntro: () => set({ intro: false, yaw: 0, pitch: 0 }),
  say: (who, speaker, text, ms) => {
    set({ subtitle: { speaker, text, who } });
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => set({ subtitle: null }), ms + 800);
  },
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
