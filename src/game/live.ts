import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLook } from "./look";

/**
 * Live guests: signed-in visitors see each other walk and sit in the restaurant.
 *
 * Guests are seated in "sittings" of up to SITTING_SIZE people, each its own Supabase Realtime channel, the way a
 * busy restaurant runs several services: the 17th guest opens a second sitting, and so on. That keeps every phone
 * drawing at most 15 other people, and keeps the message count in check (each update goes only to one sitting).
 *
 * To save messages a guest only sends while moving (a few times a second) plus a slow heartbeat; the receiving side
 * eases between updates so movement still looks continuous.
 */

export const SITTING_SIZE = 16;
const MAX_SITTINGS = 12;
const SEND_MOVING_MS = 330;
const SEND_IDLE_MS = 8000;
const STALE_MS = 25000;

export type Sample = { t: number; x: number; y: number; z: number; yaw: number; chair: string | null };
export type Peer = {
  id: string;
  name: string;
  look: number;
  samples: Sample[];
  last: number;
  /** a line of table talk, shown above their head until `until` (performance.now) */
  said?: { body: string; until: number };
};

type LiveState = {
  /** ids of the other guests in this sitting; changes only when someone arrives or leaves */
  ids: string[];
  sitting: number | null;
  /** the character each guest chose; changes rarely, so it can live in React state */
  looks: Record<string, number>;
};

export const useLive = create<LiveState>(() => ({ ids: [], sitting: null, looks: {} }));

/** Per-frame data lives outside React, so movement never causes a re-render. */
export const peers = new Map<string, Peer>();

let channel: RealtimeChannel | null = null;
let me: { id: string; name: string; look: number } | null = null;
let lastSent = 0;
let lastPayload: Sample | null = null;
let joining = false;
/** A sitting being left; joining waits for it, or the client would hand back the closing channel. */
let leaving: Promise<unknown> = Promise.resolve();

const hashLook = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

function syncIds() {
  const ids = [...peers.keys()].sort();
  const cur = useLive.getState().ids;
  if (ids.length !== cur.length || ids.some((v, i) => v !== cur[i])) useLive.setState({ ids });
}

export function addSample(id: string, name: string, s: Omit<Sample, "t">, look?: number) {
  let p = peers.get(id);
  if (!p) {
    p = { id, name, look: look ?? hashLook(id), samples: [], last: 0 };
    peers.set(id, p);
    syncIds();
  }
  if (look !== undefined && useLive.getState().looks[id] !== look) {
    p.look = look;
    useLive.setState((st) => ({ looks: { ...st.looks, [id]: look } }));
  }
  p.name = name || p.name;
  p.last = performance.now();
  p.samples.push({ ...s, t: p.last });
  if (p.samples.length > 8) p.samples.shift();
}

/** Try sittings 1, 2, 3… and stay in the first that still has room. */
async function joinSitting(n: number): Promise<void> {
  const sb = supabase();
  await leaving;
  if (!sb || !me || n > MAX_SITTINGS) return;
  const ch = sb.channel(`knak-sitting-${n}`, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  const at = Date.now();
  let decided = false;

  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState<{ at: number; name: string }>();
    if (!decided) {
      decided = true;
      // Seat order is arrival order; if this sitting was already full when we came in, try the next one.
      const order = Object.entries(state)
        .map(([key, metas]) => ({ key, at: metas[0]?.at ?? 0 }))
        .sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
      const rank = order.findIndex((o) => o.key === me!.id);
      if (rank >= SITTING_SIZE) {
        leaving = sb.removeChannel(ch);
        void joinSitting(n + 1);
        return;
      }
      channel = ch;
      useLive.setState({ sitting: n });
      lastSent = 0; // announce where we are straight away
    }
    // Anyone who has left the sitting leaves the room.
    for (const id of [...peers.keys()]) if (!state[id]) peers.delete(id);
    syncIds();
  });

  // When someone new sits down, everyone announces where they are, so the newcomer sees the room at once.
  ch.on("presence", { event: "join" }, () => {
    lastSent = 0;
  });

  ch.on("broadcast", { event: "p" }, ({ payload }) => {
    const p = payload as { id: string; n: string; x: number; y: number; z: number; r: number; c: string | null; l?: number };
    if (!p?.id || p.id === me?.id) return;
    addSample(p.id, p.n, { x: p.x, y: p.y, z: p.z, yaw: p.r, chair: p.c }, typeof p.l === "number" ? p.l : undefined);
  });

  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await ch.track({ at, name: me!.name });
  });
}

/** Join the live room as this guest. Safe to call more than once. */
export function connectLive(user: { id: string; name: string }) {
  if (channel || joining) return;
  joining = true;
  me = { id: user.id, name: user.name, look: hashLook(user.id) };
  void joinSitting(1).finally(() => {
    joining = false;
  });
}

/** The guest changed their name: others see the new one with the next update. */
// A new character choice is announced straight away.
useLook.subscribe((s, prev) => {
  if (s.look !== prev.look) lastSent = 0;
});

export function setLiveName(name: string) {
  if (me) me.name = name;
}

export function disconnectLive() {
  const sb = supabase();
  if (channel && sb) leaving = sb.removeChannel(channel).catch(() => {});
  channel = null;
  me = null;
  peers.clear();
  useLive.setState({ ids: [], sitting: null, looks: {} });
}

/** Called every frame with this guest's position; sends only when it has changed, or as a slow heartbeat. */
export function publishSelf(now: number, s: Omit<Sample, "t">) {
  // Forget anyone whose connection dropped without saying goodbye.
  let dropped = false;
  for (const [id, p] of peers)
    if (performance.now() - p.last > STALE_MS) {
      peers.delete(id);
      dropped = true;
    }
  if (dropped) syncIds();
  if (!channel || !me) return;
  const prev = lastPayload;
  const moved =
    !prev || Math.hypot(prev.x - s.x, prev.z - s.z) > 0.04 || Math.abs(prev.y - s.y) > 0.05 || Math.abs(prev.yaw - s.yaw) > 0.06 || prev.chair !== s.chair;
  const wait = moved ? SEND_MOVING_MS : SEND_IDLE_MS;
  if (now - lastSent < wait) return;
  lastSent = now;
  lastPayload = { ...s, t: now };
  const r = (v: number) => Math.round(v * 100) / 100;
  void channel.send({ type: "broadcast", event: "p", payload: { id: me.id, n: me.name, l: useLook.getState().look, x: r(s.x), y: r(s.y), z: r(s.z), r: r(s.yaw), c: s.chair } });
}

/** True while another real guest is sitting in this chair. */
export function chairTakenLive(chairId: string) {
  for (const p of peers.values()) if (p.samples[p.samples.length - 1]?.chair === chairId) return true;
  return false;
}
