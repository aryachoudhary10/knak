"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGame } from "@/game/store";
import { useAuth } from "@/game/auth";
import { peers, useLive } from "@/game/live";
import { closeChat, openChat, send, tableTitle, toggleBlock, toggleMute, unreadTotal, useChat, type Thread } from "@/game/chat";

const EASE = [0.22, 1, 0.36, 1] as const;

const exitLook = () => {
  if (document.pointerLockElement) document.exitPointerLock();
};

/** The chat button, the whisper notice and the conversation sheet. */
export default function ChatPanel() {
  const menuOpen = useGame((s) => s.menuOpen);
  const status = useAuth((s) => s.status);
  const open = useChat((s) => s.open);
  const unread = useChat(unreadTotal);
  const toast = useChat((s) => s.toast);
  if (status === "off") return null;

  return (
    <>
      {!menuOpen && !open && (
        <button
          onClick={() => {
            exitLook();
            if (status !== "signedIn") useAuth.getState().open("invite");
            else openChat(useChat.getState().table ? `t:${useChat.getState().table}` : null);
          }}
          aria-label="Conversations"
          className="pointer-events-auto absolute right-6 top-[4.5rem] z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ivory/35 text-ivory/80 transition-colors duration-300 hover:border-ivory/70 hover:text-ivory sm:right-11 sm:top-[5.6rem]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 5h16v11H9l-5 4V5z" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 font-sans text-[9px] text-ink">{unread}</span>
          )}
        </button>
      )}

      <AnimatePresence>
        {toast && !open && !menuOpen && (
          <motion.button
            key={toast.key + toast.body}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={() => {
              exitLook();
              openChat(toast.key);
            }}
            className="pointer-events-auto absolute left-1/2 top-6 z-[15] w-[min(86vw,340px)] -translate-x-1/2 cursor-pointer border border-champagne/30 bg-ink/85 px-4 py-3 text-left text-ivory backdrop-blur-md sm:top-9"
          >
            <span className="eyebrow block text-[8px] text-champagne">Whisper from {toast.name}</span>
            <span className="mt-1.5 block truncate font-display text-[14px] italic text-ivory/90">{toast.body}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>{open && !menuOpen && <Sheet key="sheet" />}</AnimatePresence>
    </>
  );
}

function Sheet() {
  const view = useChat((s) => s.view);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-[15] flex h-[64dvh] flex-col border-t border-champagne/25 bg-ink/90 text-ivory backdrop-blur-md sm:inset-x-auto sm:bottom-8 sm:right-11 sm:top-24 sm:h-auto sm:w-[360px] sm:border"
    >
      {view ? <Conversation key={view} view={view} /> : <People />}
    </motion.div>
  );
}

function Close() {
  return (
    <button onClick={closeChat} className="text-action cursor-pointer text-[9px] text-ivory/60 hover:text-ivory">
      Close
    </button>
  );
}

/** Your table, and everyone else here tonight, each a tap away from a whisper. */
function People() {
  const ids = useLive((s) => s.ids);
  const threads = useChat((s) => s.threads);
  const table = useChat((s) => s.table);
  const blocked = useChat((s) => s.blocked);
  const here = ids.map((id) => ({ key: `w:${id}`, title: peers.get(id)?.name ?? "Guest", id }));
  // People you have talked to who have since left stay listed until you leave too.
  const gone = Object.values(threads).filter((t) => t.key.startsWith("w:") && !ids.includes(t.key.slice(2)));
  const last = (t?: Thread) => t?.msgs[t.msgs.length - 1];

  const row = (k: string, title: string, sub: string) => {
    const t = threads[k];
    const m = last(t);
    return (
      <li key={k}>
        <button onClick={() => openChat(k, title)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-ivory/5">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] uppercase tracking-[0.12em]">{title}</span>
            <span className="eyebrow mt-1 block truncate text-[8px] text-ivory/50">{m ? `${m.mine ? "You: " : ""}${m.body}` : sub}</span>
          </span>
          {t?.unread ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 font-sans text-[9px] text-ink">{t.unread}</span> : null}
        </button>
      </li>
    );
  };

  return (
    <>
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <p className="eyebrow text-[9px] text-champagne">Conversations</p>
        <Close />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <p className="eyebrow px-5 pb-1 pt-2 text-[8px] text-ivory/40">Your table</p>
        <ul>
          {table ? row(`t:${table}`, tableTitle(table), "Only guests at this table can read it") : <li className="px-5 py-3 font-display text-[14px] italic text-ivory/50">Take a seat to talk with your table.</li>}
        </ul>
        <p className="eyebrow px-5 pb-1 pt-5 text-[8px] text-ivory/40">Here tonight</p>
        <ul>
          {here.length === 0 && gone.length === 0 && <li className="px-5 py-3 font-display text-[14px] italic text-ivory/50">No other guests yet. When someone comes in, you can whisper to them here.</li>}
          {here.filter((p) => !blocked.includes(p.id)).map((p) => row(p.key, p.title, "Whisper"))}
          {gone.map((t) => row(t.key, t.title, "Has left"))}
        </ul>
      </div>
    </>
  );
}

function Conversation({ view }: { view: string }) {
  const thread = useChat((s) => s.threads[view]);
  const muted = useChat((s) => s.muted);
  const blocked = useChat((s) => s.blocked);
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const whisper = view.startsWith("w:");
  const other = view.slice(2);
  const title = thread?.title || (whisper ? peers.get(other)?.name : tableTitle(other)) || "Guest";
  const msgs = thread?.msgs ?? [];
  const isBlocked = whisper && blocked.includes(other);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const submit = () => {
    if (!text.trim() || isBlocked) return;
    void send(view, title, text);
    setText("");
  };

  return (
    <>
      <header className="border-b border-ivory/10 px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={() => openChat(null)} className="text-action cursor-pointer text-[9px] text-ivory/60 hover:text-ivory">
            ← All
          </button>
          <Close />
        </div>
        <p className="mt-4 font-display text-[18px] uppercase leading-none tracking-[0.14em]">{title}</p>
        <p className="eyebrow mt-2 text-[8px] text-ivory/50">{whisper ? `Whisper · only ${title} can read this` : "Table talk · only this table can read it"}</p>
        {whisper && (
          <div className="mt-3 flex gap-5">
            <button onClick={() => toggleMute(other)} className="text-action cursor-pointer text-[8px] text-ivory/55 hover:text-ivory">
              {muted.includes(other) ? "Unmute" : "Mute"}
            </button>
            <button onClick={() => void toggleBlock(other)} className="text-action cursor-pointer text-[8px] text-ivory/55 hover:text-bordeaux">
              {isBlocked ? "Unblock" : "Block"}
            </button>
          </div>
        )}
      </header>
      <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {msgs.length === 0 && (
          <p className="pt-6 text-center font-display text-[14px] italic text-ivory/45">
            {whisper ? `Say bonjour to ${title}.` : "Say hello to your table."}
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mine ? "items-end text-right" : "items-start"}`}>
            {!whisper && !m.mine && <span className="eyebrow mb-1 text-[7.5px] text-champagne/80">{m.name}</span>}
            <span className={`max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 font-sans text-[13px] leading-snug ${m.mine ? "bg-ivory/12 text-ivory" : "border border-ivory/15 text-ivory/90"}`}>{m.body}</span>
            {m.failed && <span className="eyebrow mt-1 text-[7.5px] text-bordeaux">{m.failed}</span>}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-3 border-t border-ivory/10 px-4 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          disabled={isBlocked}
          placeholder={isBlocked ? "You have blocked this guest" : whisper ? "Whisper…" : "Say something to the table…"}
          className="min-w-0 flex-1 bg-transparent font-sans text-[16px] text-ivory outline-none placeholder:text-ivory/35 sm:text-[13px]"
        />
        <button type="submit" disabled={!text.trim() || isBlocked} className="text-action cursor-pointer text-[9px] text-champagne disabled:opacity-30">
          Send
        </button>
      </form>
    </>
  );
}
