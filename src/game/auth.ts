import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** What KNAK keeps about a guest: who to greet and where to deliver. One row per account in `profiles`. */
export type Profile = { name: string; phone: string; address: string; pincode: string };

export const profileComplete = (p: Profile | null): p is Profile =>
  !!p && p.name.trim().length > 1 && /^\+?\d[\d\s-]{8,}$/.test(p.phone.trim()) && p.address.trim().length > 5 && /^\d{6}$/.test(p.pincode.trim());

type Step = "choose" | "email" | "code" | "profile";

type Auth = {
  /** "off" when Supabase isn't configured: no sign-in is offered and everyone is a guest. */
  status: "loading" | "off" | "signedOut" | "signedIn";
  user: User | null;
  profile: Profile | null;
  /** the sign-in panel, and why it was opened (from the invitation, or because an order needs an address) */
  panel: null | { reason: "invite" | "order" | "address"; step: Step };
  init: () => void;
  open: (reason: "invite" | "order" | "address") => void;
  close: () => void;
  setStep: (step: Step) => void;
  google: () => Promise<string | null>;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  saveProfile: (p: Profile) => Promise<string | null>;
  signOut: () => Promise<void>;
};

let started = false;

const friendly = (msg: string) => {
  if (/rate limit/i.test(msg)) return "Too many codes were sent just now. Please try again in a little while.";
  if (/failed to fetch|network/i.test(msg)) return "We couldn’t reach KNAK just now. Please check your connection and try again.";
  if (/expired|invalid/i.test(msg)) return "That code didn’t match or has expired. Please check it, or send a new one.";
  return msg;
};

export const useAuth = create<Auth>((set, get) => ({
  status: "loading",
  user: null,
  profile: null,
  panel: null,

  init: () => {
    if (started) return;
    started = true;
    const sb = supabase();
    if (!sb) {
      set({ status: "off" });
      return;
    }
    const load = async (user: User | null) => {
      if (!user) {
        set({ status: "signedOut", user: null, profile: null });
        return;
      }
      set({ status: "signedIn", user });
      const { data } = await sb.from("profiles").select("name, phone, address, pincode").eq("id", user.id).maybeSingle();
      const meta = user.user_metadata ?? {};
      const profile: Profile = {
        name: data?.name ?? meta.full_name ?? meta.name ?? "",
        phone: data?.phone ?? user.phone ?? "",
        address: data?.address ?? "",
        pincode: data?.pincode ?? "",
      };
      set({ profile });
      // A guest who has just signed in but hasn't told us where to deliver goes straight on to that step.
      const panel = get().panel;
      if (panel && !profileComplete(profile)) set({ panel: { ...panel, step: "profile" } });
      else if (panel && panel.reason !== "address") set({ panel: null });
    };
    sb.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(session?.user ?? null);
    });
    // Back from Google: reopen the panel so a new guest lands on the delivery details step.
    if (typeof window !== "undefined" && sessionStorage.getItem("knak-auth-return")) {
      const reason = sessionStorage.getItem("knak-auth-return") as "invite" | "order";
      sessionStorage.removeItem("knak-auth-return");
      set({ panel: { reason, step: "choose" } });
    }
  },

  open: (reason) => {
    const { status, profile } = get();
    if (status === "signedIn") set({ panel: { reason, step: reason === "address" || !profileComplete(profile) ? "profile" : "choose" } });
    else set({ panel: { reason, step: "choose" } });
  },
  close: () => set({ panel: null }),
  setStep: (step) => {
    const panel = get().panel;
    if (panel) set({ panel: { ...panel, step } });
  },

  google: async () => {
    const sb = supabase();
    if (!sb) return "Sign-in isn’t available right now.";
    try {
      sessionStorage.setItem("knak-auth-return", get().panel?.reason === "order" ? "order" : "invite");
    } catch {}
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname } });
    return error ? friendly(error.message) : null;
  },

  sendCode: async (email) => {
    const sb = supabase();
    if (!sb) return "Sign-in isn’t available right now.";
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    if (error) return friendly(error.message);
    get().setStep("code");
    return null;
  },

  verifyCode: async (email, code) => {
    const sb = supabase();
    if (!sb) return "Sign-in isn’t available right now.";
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    return error ? friendly(error.message) : null;
  },

  saveProfile: async (p) => {
    const sb = supabase();
    const user = get().user;
    if (!sb || !user) return "Please sign in first.";
    const clean: Profile = { name: p.name.trim(), phone: p.phone.trim(), address: p.address.trim(), pincode: p.pincode.trim() };
    const { error } = await sb.from("profiles").upsert({ id: user.id, ...clean, updated_at: new Date().toISOString() });
    if (error) return "We couldn’t save your details. Please try again.";
    set({ profile: clean, panel: null });
    return null;
  },

  signOut: async () => {
    await supabase()?.auth.signOut();
    set({ status: "signedOut", user: null, profile: null, panel: null });
  },
}));
