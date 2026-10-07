import { create } from "zustand";
import { supabase } from "@/lib/supabase";

/**
 * Which guest character you appear as to everyone else in KNAK: an index into GUEST_AVATARS.
 * Remembered on this device, and on the guest's profile once they are signed in, so it follows them across devices.
 */
export const LOOK_COUNT = 8;
const KEY = "knak-look";

function initial() {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (Number.isInteger(v) && v >= 0 && v < LOOK_COUNT && localStorage.getItem(KEY) !== null) return v;
  } catch {}
  return typeof window === "undefined" ? 0 : Math.floor(Math.random() * LOOK_COUNT);
}

type LookState = { look: number; picker: boolean };
export const useLook = create<LookState>(() => ({ look: initial(), picker: false }));

export const portrait = (i: number) => `/avatars/guest-${i}.webp`;

/** The guest chose a character. */
export async function chooseLook(look: number) {
  useLook.setState({ look });
  try {
    localStorage.setItem(KEY, String(look));
  } catch {}
  const sb = supabase();
  const uid = (await sb?.auth.getSession())?.data.session?.user.id;
  if (sb && uid) await sb.from("profiles").update({ look }).eq("id", uid);
}

/** A signed-in guest's saved choice wins over this device's. */
export function adoptSavedLook(look: number | null | undefined) {
  if (look === null || look === undefined || look < 0 || look >= LOOK_COUNT) return;
  useLook.setState({ look });
  try {
    localStorage.setItem(KEY, String(look));
  } catch {}
}
