"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/game/auth";
import { formatINR } from "@/data/menu";
import AuthPanel from "@/components/ui/AuthPanel";

/**
 * KNAK's kitchen screen: every order as it arrives, live. The team checks the UPI app and marks payment, then moves
 * each order along: preparing, ready, out for delivery, delivered. Only staff can open it (see 20261007_kitchen.sql).
 */

type Status = "placed" | "preparing" | "prepared" | "out_for_delivery" | "delivered" | "cancelled";
type Payment = "claimed" | "confirmed" | "failed";
type Line = { id: string; name: string; price: number; qty: number };
export type Order = {
  id: string;
  number: number;
  items: Line[];
  total: number;
  name: string;
  phone: string;
  address: string;
  pincode: string;
  status: Status;
  payment: Payment;
  created_at: string;
  /** the creator code whose link brought this guest */
  ref?: string | null;
};

const ACTIVE: { status: Status; title: string; next?: { to: Status; label: string } }[] = [
  { status: "placed", title: "New", next: { to: "preparing", label: "Start preparing" } },
  { status: "preparing", title: "Preparing", next: { to: "prepared", label: "Ready" } },
  { status: "prepared", title: "Ready", next: { to: "out_for_delivery", label: "Out for delivery" } },
  { status: "out_for_delivery", title: "On the way", next: { to: "delivered", label: "Delivered" } },
];

const ago = (iso: string, now: number) => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** A short two-note chime for a new order, so the kitchen hears it across the room. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {}
}

export default function Kitchen() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const [staff, setStaff] = useState<boolean | null>(null);

  useEffect(() => useAuth.getState().init(), []);
  useEffect(() => {
    const sb = supabase();
    if (status !== "signedIn" || !sb) return;
    let live = true;
    void sb.rpc("is_staff").then(({ data }) => live && setStaff(data === true));
    return () => {
      live = false;
    };
  }, [status, user?.id]);

  return (
    <div className="allow-copy h-full overflow-y-auto bg-paper text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-paper/95 px-5 py-4 backdrop-blur sm:px-10">
        <div>
          <p className="font-display text-[22px] leading-none tracking-[0.45em]">KNAK</p>
          <p className="eyebrow mt-1.5 text-[9px] text-stone">Kitchen</p>
        </div>
        {status === "signedIn" && (
          <button onClick={() => void useAuth.getState().signOut()} className="text-action cursor-pointer text-[10px] text-stone hover:text-ink">
            Sign out
          </button>
        )}
      </header>
      {status === "loading" || (status === "signedIn" && staff === null) ? (
        <Note title="One moment" />
      ) : status === "off" ? (
        <Note title="Sign-in isn’t set up here" />
      ) : status === "signedOut" ? (
        <Note title="For the KNAK team" body="Sign in with your staff email to see tonight’s orders.">
          <button onClick={() => useAuth.getState().open("invite")} className="mt-8 cursor-pointer border border-ink px-8 py-3 font-sans text-[11px] uppercase tracking-[0.3em] hover:bg-ink hover:text-paper">
            Sign in
          </button>
        </Note>
      ) : !staff ? (
        <Note title="This page is for the KNAK team" body={`You are signed in as ${user?.email}. Ask the owner to add this email to the team.`} />
      ) : (
        <Board />
      )}
      <AuthPanel />
    </div>
  );
}

function Note({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <p className="font-display text-3xl italic">{title}</p>
      {body && <p className="mt-4 max-w-sm font-sans text-sm text-stone">{body}</p>}
      {children}
    </div>
  );
}

function Board() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "done" | "creators" | "team">("active");
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const load = async () => {
      const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) setError("Couldn’t load orders. Pull to refresh, or check the connection.");
      else {
        (data as Order[]).forEach((o) => seen.current.add(o.id));
        setOrders(data as Order[]);
        setError(null);
      }
    };
    void load();
    const ch = sb
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ({ new: row }) => {
        const o = row as Order;
        if (!o?.id) return;
        if (!seen.current.has(o.id)) {
          seen.current.add(o.id);
          chime();
        }
        setOrders((list) => [o, ...list.filter((x) => x.id !== o.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      })
      .subscribe((s) => {
        // Back from a dropped connection: catch up on anything missed.
        if (s === "SUBSCRIBED") void load();
      });
    // A phone that slept may have missed messages; refresh when the screen comes back.
    const wake = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      void sb.removeChannel(ch);
    };
  }, []);

  const update = async (o: Order, patch: Partial<Pick<Order, "status" | "payment">>) => {
    const sb = supabase();
    if (!sb) return;
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    const { error } = await sb.rpc("update_order", { p_id: o.id, p_status: patch.status ?? null, p_payment: patch.payment ?? null });
    if (error) {
      setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));
      setError(`Order ${o.number} wasn’t updated. Please try again.`);
    }
  };

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const done = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
  const unpaid = active.filter((o) => o.payment === "claimed").length;

  return (
    <div className="px-5 pb-16 pt-5 sm:px-10">
      <nav className="flex gap-6">
        {(
          [
            ["active", `Tonight · ${active.length}`],
            ["done", `Finished · ${done.length}`],
            ["creators", "Creators"],
            ["team", "Team"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`eyebrow cursor-pointer border-b pb-2 text-[10px] ${tab === k ? "border-bordeaux text-ink" : "border-transparent text-stone hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </nav>
      {unpaid > 0 && tab === "active" && (
        <p className="mt-4 font-sans text-[13px] text-bordeaux">
          {unpaid} {unpaid === 1 ? "order is" : "orders are"} waiting for you to check the payment in your UPI app.
        </p>
      )}
      {error && <p className="mt-4 font-sans text-[13px] text-bordeaux">{error}</p>}

      {tab === "active" &&
        (active.length === 0 ? (
          <p className="mt-16 text-center font-display text-2xl italic text-stone">No orders waiting. New ones appear here with a chime.</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-4">
            {ACTIVE.map((col) => {
              const list = active.filter((o) => o.status === col.status).reverse();
              return (
                <section key={col.status}>
                  <p className="eyebrow border-b border-ink/15 pb-2 text-[10px] text-stone">
                    {col.title} · {list.length}
                  </p>
                  <div className="mt-3 space-y-3">
                    {list.map((o) => (
                      <Ticket key={o.id} o={o} now={now} next={col.next} update={update} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ))}

      {tab === "done" && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {done.length === 0 && <p className="text-stone">Nothing finished yet.</p>}
          {done.map((o) => (
            <Ticket key={o.id} o={o} now={now} update={update} />
          ))}
        </div>
      )}

      {tab === "creators" && <Creators />}
      {tab === "team" && <Team />}
    </div>
  );
}

function Ticket({ o, now, next, update }: { o: Order; now: number; next?: { to: Status; label: string }; update: (o: Order, p: Partial<Pick<Order, "status" | "payment">>) => void }) {
  const finished = o.status === "delivered" || o.status === "cancelled";
  return (
    <article className={`border bg-ivory/60 p-4 ${o.status === "placed" ? "border-bordeaux/50" : "border-ink/12"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl">No. {o.number}</p>
        <p className="font-sans text-[11px] text-stone">{ago(o.created_at, now)}</p>
      </div>
      <ul className="mt-3 space-y-1 font-sans text-[14px]">
        {o.items.map((l) => (
          <li key={l.id} className="flex justify-between gap-3">
            <span>
              <span className="font-medium">{l.qty} ×</span> {l.name}
            </span>
            <span className="text-stone">{formatINR(l.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-sans text-[14px] font-medium">
        <span>Total</span>
        <span>{formatINR(o.total)}</span>
      </p>
      <div className="mt-3 font-sans text-[13px] leading-relaxed text-ink/80">
        <p className="font-medium text-ink">{o.name}</p>
        <a href={`tel:${o.phone}`} className="underline decoration-ink/30 underline-offset-2">
          {o.phone}
        </a>
        <p>
          {o.address}, {o.pincode}
        </p>
        {o.ref && <p className="eyebrow mt-1.5 text-[9px] text-bordeaux/80">Via {o.ref}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-[12px]">
        {o.payment === "claimed" ? (
          <>
            <span className="text-bordeaux">Guest says paid. Check UPI:</span>
            <button onClick={() => update(o, { payment: "confirmed" })} className="cursor-pointer border border-[#3f6b3a] px-2.5 py-1 text-[#3f6b3a] hover:bg-[#3f6b3a] hover:text-paper">
              Received
            </button>
            <button onClick={() => update(o, { payment: "failed" })} className="cursor-pointer border border-ink/25 px-2.5 py-1 text-stone hover:border-bordeaux hover:text-bordeaux">
              Not received
            </button>
          </>
        ) : o.payment === "confirmed" ? (
          <span className="text-[#3f6b3a]">Paid ✓</span>
        ) : (
          <>
            <span className="text-bordeaux">Payment not received</span>
            <button onClick={() => update(o, { payment: "confirmed" })} className="cursor-pointer text-stone underline hover:text-ink">
              It arrived
            </button>
          </>
        )}
      </div>

      {!finished && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {next && (
            <button onClick={() => update(o, { status: next.to })} className="flex-1 cursor-pointer bg-ink px-4 py-2.5 font-sans text-[11px] uppercase tracking-[0.2em] text-paper hover:bg-bordeaux">
              {next.label}
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Cancel order ${o.number}?`)) update(o, { status: "cancelled" });
            }}
            className="cursor-pointer font-sans text-[11px] text-stone hover:text-bordeaux"
          >
            Cancel
          </button>
        </div>
      )}
      {finished && <p className="mt-3 font-sans text-[12px] text-stone">{o.status === "delivered" ? "Delivered" : "Cancelled"}</p>}
    </article>
  );
}

function Team() {
  const [team, setTeam] = useState<{ user_id: string; email: string; role: string }[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const me = useAuth((s) => s.user?.id);
  const owner = useMemo(() => team.some((t) => t.user_id === me && t.role === "owner"), [team, me]);
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let live = true;
    void supabase()
      ?.rpc("team")
      .then(({ data }) => live && data && setTeam(data));
    return () => {
      live = false;
    };
  }, [rev]);
  const add = async () => {
    const { data, error } = (await supabase()?.rpc("add_staff", { p_email: email })) ?? {};
    if (error) setMsg("Only the owner can add people to the team.");
    else if (!data) setMsg("No KNAK account with that email yet. Ask them to sign in on the site once, then add them.");
    else {
      setMsg(`${email} can now open the kitchen.`);
      setEmail("");
      setRev((r) => r + 1);
    }
  };
  return (
    <div className="mt-6 max-w-md">
      <ul className="divide-y divide-ink/10 border-y border-ink/10 font-sans text-[14px]">
        {team.map((t) => (
          <li key={t.user_id} className="flex justify-between py-3">
            <span>{t.email}</span>
            <span className="text-stone">{t.role === "owner" ? "Owner" : "Staff"}</span>
          </li>
        ))}
      </ul>
      {owner && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="mt-6 flex gap-3"
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Their email"
            className="min-w-0 flex-1 border-b border-ink/25 bg-transparent py-2 font-sans text-[15px] outline-none focus:border-bordeaux"
          />
          <button type="submit" className="cursor-pointer border border-ink px-4 font-sans text-[11px] uppercase tracking-[0.2em] hover:bg-ink hover:text-paper">
            Add
          </button>
        </form>
      )}
      {msg && <p className="mt-3 font-sans text-[13px] text-stone">{msg}</p>}
    </div>
  );
}

type CreatorRow = { ref: string; visits: number; orders: number; revenue: number; last_order: string | null };

/** Which creators' links bring visits and real orders. Each creator shares knak.vercel.app/?ref=theirname. */
function Creators() {
  const [rows, setRows] = useState<CreatorRow[] | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    void supabase()
      ?.rpc("creator_stats")
      .then(({ data }) => live && setRows((data as CreatorRow[]) ?? []));
    return () => {
      live = false;
    };
  }, []);
  const clean = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  const link = `${location.origin}/?ref=${clean}`;
  return (
    <div className="mt-6 max-w-2xl">
      <p className="font-sans text-[14px] text-stone">Give each creator their own link. Every visit and order that comes through it is counted here, for 30 days after their visit.</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setCopied(false);
          }}
          placeholder="Their name, e.g. priya"
          className="min-w-0 flex-1 border-b border-ink/25 bg-transparent py-2 font-sans text-[15px] outline-none focus:border-bordeaux"
        />
        <button
          disabled={clean.length < 2}
          onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}
          className="cursor-pointer border border-ink px-4 py-2 font-sans text-[11px] uppercase tracking-[0.2em] hover:bg-ink hover:text-paper disabled:opacity-30"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {clean.length >= 2 && <p className="mt-2 break-all font-sans text-[13px] text-ink/70">{link}</p>}

      <table className="mt-8 w-full font-sans text-[14px]">
        <thead>
          <tr className="eyebrow border-b border-ink/15 text-left text-[9px] text-stone">
            <th className="pb-2 font-normal">Creator</th>
            <th className="pb-2 text-right font-normal">Visits</th>
            <th className="pb-2 text-right font-normal">Orders</th>
            <th className="pb-2 text-right font-normal">Sales</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {rows?.map((r) => (
            <tr key={r.ref}>
              <td className="py-3">{r.ref}</td>
              <td className="py-3 text-right">{r.visits}</td>
              <td className="py-3 text-right">{r.orders}</td>
              <td className="py-3 text-right">{formatINR(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <p className="mt-6 font-display text-xl italic text-stone">No creator visits yet. Share a link above to start.</p>}
    </div>
  );
}
