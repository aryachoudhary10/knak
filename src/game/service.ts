import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./auth";
import { useGame } from "./store";
import { speak } from "./audio";
import { runtime } from "./runtime";

/**
 * When the kitchen marks a guest's order ready, the restaurant answers: Théo brings a plate to their table (or to
 * them, if they are walking about), and says the real dish is on its way. Watching only this guest's orders is
 * allowed by the "Guests read their own orders" policy.
 */

export type Serving = { id: string; number: number; dish: string; line: string; at: number };

export const useService = create<{ serving: Serving | null; /** chair a plate has been set at */ plateAt: string | null }>(() => ({
  serving: null,
  plateAt: null,
}));

type Row = { id: string; number: number; status: string; items: { name: string; qty: number }[] };

let ch: RealtimeChannel | null = null;
const served = new Set<string>();

export function startService(uid: string) {
  const sb = supabase();
  if (!sb) return;
  stopService();
  ch = sb
    .channel(`service:${uid}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${uid}` }, ({ new: row }) => {
      const o = row as Row;
      if (o?.status !== "prepared" || served.has(o.id)) return;
      served.add(o.id);
      const first = name();
      const dish = o.items?.[0]?.name ?? "order";
      const more = (o.items?.length ?? 0) > 1 ? " and the rest" : "";
      const line = `${first ? `${first}, your` : "Your"} ${dish}${more} is ready! It is leaving our kitchen for your door now.`;
      useService.setState({ serving: { id: o.id, number: o.number, dish, line, at: runtime.now } });
    })
    .subscribe();
}

export function stopService() {
  const sb = supabase();
  if (ch && sb) void sb.removeChannel(ch);
  ch = null;
  useService.setState({ serving: null, plateAt: null });
}

const name = () => useAuth.getState().profile?.name?.trim().split(/\s+/)[0] ?? "";

/** Théo has reached the guest: he speaks, and if they are seated the plate goes down in front of them. */
export function arrive() {
  const s = useService.getState().serving;
  if (!s) return;
  const chair = useGame.getState().seatedChairId;
  const ms = speak(s.line, { prefer: "male", pitch: 1 });
  useGame.getState().say("waiter", "Théo", s.line, ms);
  useService.setState({ plateAt: chair });
  return ms;
}

/** Nobody can reach the guest where they are (on the terrace, upstairs, in the bar): Louis calls it from the counter. */
export function announce() {
  const s = useService.getState().serving;
  if (!s) return;
  const ms = speak(s.line, { prefer: "male", pitch: 0.95 });
  useGame.getState().say("cashier", "Louis", s.line, ms);
  useService.setState({ serving: null });
}

export const doneServing = () => useService.setState({ serving: null });

// Standing up leaves the plate behind for the staff to clear.
useGame.subscribe((s, prev) => {
  if (prev.seatedChairId && s.seatedChairId !== prev.seatedChairId) useService.setState({ plateAt: null });
});
