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

const firstName = () => useAuth.getState().profile?.name.trim().split(/\s+/)[0] || null;

/** Amélie's welcome: short, by name, and mindful of their last visit. */
export function hostGreeting() {
  const name = firstName();
  if (!name) return "Hi, welcome to KNAK!";
  if (last && Date.now() - last.at < 1000 * 60 * 60 * 6) {
    if (last.status === "out_for_delivery") return `Hi ${name}! Your order is on its way to you.`;
    if (last.status === "placed" || last.status === "preparing") return `Hi ${name}! The kitchen is preparing your order right now.`;
    if (last.status === "prepared") return `Hi ${name}! Your order is ready and leaving us shortly.`;
  }
  const fav = favourite();
  if (fav) return `Hi ${name}, welcome back! How was the ${fav.name} last time?`;
  return `Hi ${name}, welcome to KNAK!`;
}

/** Louis at the counter, offering the usual to a returning guest. */
export function cashierGreeting() {
  const fav = favourite();
  const name = firstName();
  if (name && fav) return `Hello again, ${name}. The ${fav.name} again, or something new tonight?`;
  return "Hello! Here is our menu. Everything is cooked fresh for delivery.";
}

// Remember whoever signs in; forget them on sign-out.
useAuth.subscribe((s, prev) => {
  if (s.user?.id === prev.user?.id) return;
  if (s.user) void rememberGuest();
  else forgetGuest();
});
if (useAuth.getState().user) void rememberGuest();
