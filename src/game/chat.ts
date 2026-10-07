import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { TABLES } from "./layout";
import { peers } from "./live";

/**
 * Guest chat, the way people talk in a café: a whisper to one person, or table talk with whoever shares your table.
 *
 * Nothing is kept. Messages travel over private Realtime channels and Postgres decides who may listen
 * (see supabase/migrations/20261007_chat.sql):
 *   whisper:<uid>   only that guest hears it
 *   table:<id>      only the guests seated at that table
 * Sending goes through the send_whisper / send_table functions, so the sender's name is genuine and blocks hold.
 * Conversations live only in this tab; leaving the site forgets them.
 */

export type ChatMsg = { id: string; from: string; name: string; body: string; at: number; mine: boolean; failed?: string };
/** key is "w:<their uid>" for a whisper, "t:<table id>" for table talk */
export type Thread = { key: string; title: string; msgs: ChatMsg[]; unread: number };

type ChatState = {
  open: boolean;
  /** the open conversation, or null for the list of people */
  view: string | null;
  threads: Record<string, Thread>;
  /** the table this guest is seated at and listening to */
  table: string | null;
  muted: string[];
  blocked: string[];
  /** a whisper that just arrived while the chat was closed or on another conversation */
  toast: { key: string; name: string; body: string } | null;
};

export const useChat = create<ChatState>(() => ({
  open: false,
  view: null,
  threads: {},
  table: null,
  muted: readMuted(),
  blocked: [],
  toast: null,
}));

function readMuted(): string[] {
  try {
    return typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem("knak-muted") ?? "[]");
  } catch {
    return [];
  }
}

export const tableTitle = (id: string) => `Table ${String(TABLES.findIndex((t) => t.id.toLowerCase() === id) + 1).padStart(2, "0")}`;

let me: string | null = null;
let inbox: RealtimeChannel | null = null;
let tableCh: RealtimeChannel | null = null;
/** Seat changes run one after another, so a quick sit-stand-sit never leaves a stale channel or seat. */
let seatQueue: Promise<unknown> = Promise.resolve();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const hidden = (from: string) => {
  const s = useChat.getState();
  return s.muted.includes(from) || s.blocked.includes(from);
};

function append(key: string, title: string, msg: ChatMsg) {
  useChat.setState((s) => {
    const t = s.threads[key] ?? { key, title, msgs: [], unread: 0 };
    const reading = s.open && s.view === key;
    return {
      threads: {
        ...s.threads,
        [key]: { ...t, title: title || t.title, msgs: [...t.msgs, msg].slice(-120), unread: msg.mine || reading ? t.unread : t.unread + 1 },
      },
    };
  });
}

type Incoming = { from: string; name: string; body: string; at: number; to?: string; table?: string };
let seq = 0;

/** Start listening for whispers. Called once the guest is signed in and inside. */
export function startChat(uid: string) {
  const sb = supabase();
  if (!sb || me === uid) return;
  stopChat();
  me = uid;
  void sb
    .from("blocks")
    .select("blocked")
    .then(({ data }) => data && useChat.setState({ blocked: data.map((r) => r.blocked as string) }));
  const ch = sb.channel(`whisper:${uid}`, { config: { private: true } });
  ch.on("broadcast", { event: "w" }, ({ payload }) => {
    const m = payload as Incoming;
    if (!m?.from || hidden(m.from)) return;
    const key = `w:${m.from}`;
    append(key, m.name, { id: `r${seq++}`, from: m.from, name: m.name, body: m.body, at: m.at, mine: false });
    const s = useChat.getState();
    if (!(s.open && s.view === key)) {
      clearTimeout(toastTimer);
      useChat.setState({ toast: { key, name: m.name, body: m.body } });
      toastTimer = setTimeout(() => useChat.setState({ toast: null }), 6000);
    }
  });
  ch.subscribe();
  inbox = ch;
}

export function stopChat() {
  const sb = supabase();
  if (inbox && sb) void sb.removeChannel(inbox);
  inbox = null;
  if (me) void setTable(null);
  me = null;
  useChat.setState({ threads: {}, open: false, view: null, toast: null, table: null });
}

/** Sit down at a table (join its talk) or stand up (leave it). */
export function setTable(table: string | null) {
  const uid = me;
  const tableId = table?.toLowerCase() ?? null;
  seatQueue = seatQueue.then(async () => {
    const sb = supabase();
    if (!sb) return;
    if (tableCh) {
      await sb.removeChannel(tableCh).catch(() => {});
      tableCh = null;
    }
    if (!tableId || !uid) {
      useChat.setState((s) => ({ table: null, view: s.view?.startsWith("t:") ? null : s.view }));
      if (uid) await sb.from("seats").delete().eq("user_id", uid);
      return;
    }
    // The seat must be on record before joining: Postgres checks it when the channel opens.
    const { error } = await sb.from("seats").upsert({ user_id: uid, table_id: tableId, at: new Date().toISOString() });
    if (error) return;
    const key = `t:${tableId}`;
    const ch = sb.channel(`table:${tableId}`, { config: { private: true } });
    ch.on("broadcast", { event: "t" }, ({ payload }) => {
      const m = payload as Incoming;
      if (!m?.from || m.from === me || hidden(m.from)) return;
      append(key, tableTitle(tableId), { id: `r${seq++}`, from: m.from, name: m.name, body: m.body, at: m.at, mine: false });
      // Those at the table also see the line above the speaker's head for a moment.
      const p = peers.get(m.from);
      if (p) p.said = { body: m.body, until: performance.now() + Math.min(9000, 3500 + m.body.length * 60) };
    });
    ch.subscribe();
    tableCh = ch;
    useChat.setState((s) => ({
      table: tableId,
      threads: s.threads[key] ? s.threads : { ...s.threads, [key]: { key, title: tableTitle(tableId), msgs: [], unread: 0 } },
    }));
  });
  return seatQueue;
}

const friendly = (msg: string) => {
  if (/slow down/i.test(msg)) return "Slow down a little";
  if (/take a seat/i.test(msg)) return "Take a seat to talk at a table";
  if (/fetch|network/i.test(msg)) return "Not sent: no connection";
  return "Not sent";
};

/** Send a line into a conversation. */
export async function send(key: string, title: string, raw: string) {
  const sb = supabase();
  const body = raw.trim().slice(0, 280);
  if (!sb || !me || !body) return;
  const id = `m${seq++}`;
  append(key, title, { id, from: me, name: "You", body, at: Date.now(), mine: true });
  const { error } = key.startsWith("w:")
    ? await sb.rpc("send_whisper", { p_to: key.slice(2), p_body: body })
    : await sb.rpc("send_table", { p_body: body });
  if (error)
    useChat.setState((s) => {
      const t = s.threads[key];
      return t ? { threads: { ...s.threads, [key]: { ...t, msgs: t.msgs.map((m) => (m.id === id ? { ...m, failed: friendly(error.message) } : m)) } } } : {};
    });
}

export function openChat(view: string | null = null, title?: string) {
  useChat.setState((s) => {
    const threads = { ...s.threads };
    if (view) threads[view] = { ...(threads[view] ?? { key: view, title: title ?? "", msgs: [] }), title: title || threads[view]?.title || "", unread: 0 };
    return { open: true, view, threads, toast: s.toast?.key === view ? null : s.toast };
  });
}

export const closeChat = () => useChat.setState({ open: false });

export function toggleMute(uid: string) {
  useChat.setState((s) => {
    const muted = s.muted.includes(uid) ? s.muted.filter((m) => m !== uid) : [...s.muted, uid];
    try {
      localStorage.setItem("knak-muted", JSON.stringify(muted));
    } catch {}
    return { muted };
  });
}

/** Block a guest: they can no longer whisper to you, and their table talk is hidden. */
export async function toggleBlock(uid: string) {
  const sb = supabase();
  if (!sb || !me) return;
  const blocked = useChat.getState().blocked.includes(uid);
  useChat.setState((s) => ({ blocked: blocked ? s.blocked.filter((b) => b !== uid) : [...s.blocked, uid] }));
  if (blocked) await sb.from("blocks").delete().eq("blocker", me).eq("blocked", uid);
  else await sb.from("blocks").insert({ blocker: me, blocked: uid });
}

export const unreadTotal = (s: ChatState) => Object.values(s.threads).reduce((n, t) => n + t.unread, 0);
