import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth";

/**
 * What the staff remember about a signed-in guest: their last order, so Amélie can ask how it was, or tell them it is
 * on its way, and Louis can offer it again. Loaded as soon as the guest is known, so the greeting never waits on it.
 */

type LastOrder = { items: { id: string; name: string; qty: number }[]; status: string; at: number };
let last: LastOrder | null = null;
let loadedFor: string | null = null;

export async function rememberGuest(force = false) {
  const sb = supabase();
  const uid = useAuth.getState().user?.id;
  if (!sb || !uid || (loadedFor === uid && !force)) return;
  loadedFor = uid;
  last = null;
  const { data } = await sb.from("orders").select("items, status, created_at").eq("user_id", uid).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (data) last = { items: data.items ?? [], status: data.status, at: new Date(data.created_at).getTime() };
}

export function forgetGuest() {
  last = null;
  loadedFor = null;
}

/** The dish they had the most of last time (the first one if tied). */
function favourite() {
  const items = last?.items ?? [];
  return items.reduce<(typeof items)[number] | null>((best, it) => (!best || it.qty > best.qty ? it : best), null);
}

export const firstName = () => useAuth.getState().profile?.name.trim().split(/\s+/)[0] || null;

/**
 * A spoken line: the words shown in the caption, and the recording that says them (public/voice/<clip>.mp3). The
 * recordings leave out the guest's name, which only the caption carries; per-dish lines are recorded for every dish.
 */
export type Line = { text: string; clip: string };

/** Amélie's welcome: short, by name, and mindful of their last visit. */
export function hostGreeting(): Line {
  const name = firstName();
  if (!name) return { text: "Hi, welcome to KNAK!", clip: "host-welcome" };
  if (last && Date.now() - last.at < 1000 * 60 * 60 * 6) {
    if (last.status === "out_for_delivery") return { text: `Hi ${name}! Your order is on its way to you.`, clip: "host-on-way" };
    if (last.status === "placed" || last.status === "preparing") return { text: `Hi ${name}! The kitchen is preparing your order right now.`, clip: "host-preparing" };
    if (last.status === "prepared") return { text: `Hi ${name}! Your order is ready and leaving us shortly.`, clip: "host-ready" };
  }
  const fav = favourite();
  if (fav) return { text: `Hi ${name}, welcome back! How was the ${fav.name} last time?`, clip: `host-fav-${fav.id}` };
  return { text: `Hi ${name}, welcome to KNAK!`, clip: "host-welcome" };
}

/** Louis at the counter, offering the usual to a returning guest. */
export function cashierGreeting(): Line {
  const fav = favourite();
  const name = firstName();
  if (name && fav) return { text: `Hello again, ${name}. The ${fav.name} again, or something new tonight?`, clip: `cashier-again-${fav.id}` };
  return { text: "Hello! Here is our menu. Everything is cooked fresh for delivery.", clip: "cashier-menu" };
}

// Remember whoever signs in; forget them on sign-out.
useAuth.subscribe((s, prev) => {
  if (s.user?.id === prev.user?.id) return;
  if (s.user) void rememberGuest();
  else forgetGuest();
});
if (useAuth.getState().user) void rememberGuest();
