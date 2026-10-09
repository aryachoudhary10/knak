import { supabase } from "@/lib/supabase";

/**
 * Creator invite links: knak.vercel.app/?ref=priya. The code is remembered for 30 days, so a guest who watches a
 * Reel tonight and orders on Saturday still counts for that creator; the latest creator's link wins. Each browser
 * counts as one visit per code per day. See supabase/migrations/20261009_creator_codes.sql.
 */

const KEY = "knak-ref";
const DAYS = 30;
const VALID = /^[a-z0-9_-]{2,32}$/;

export function captureRef() {
  try {
    const raw = new URLSearchParams(location.search).get("ref")?.trim().toLowerCase();
    if (!raw || !VALID.test(raw)) return;
    localStorage.setItem(KEY, JSON.stringify({ ref: raw, at: Date.now() }));
    const today = new Date().toISOString().slice(0, 10);
    const seen = `knak-ref-seen:${raw}`;
    if (localStorage.getItem(seen) === today) return;
    localStorage.setItem(seen, today);
    void supabase()?.rpc("count_visit", { p_ref: raw }).then(() => {});
  } catch {}
}

/** The creator code that brought this guest, if it is still fresh. */
export function currentRef(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { ref: string; at: number } | null;
    return v && VALID.test(v.ref) && Date.now() - v.at < DAYS * 864e5 ? v.ref : null;
  } catch {
    return null;
  }
}
