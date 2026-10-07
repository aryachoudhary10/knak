"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { profileComplete, useAuth, type Profile } from "@/game/auth";

const EASE = [0.22, 1, 0.36, 1] as const;
const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.4, ease: EASE },
};

const field =
  "mt-2 w-full border-0 border-b border-ink/20 bg-transparent px-0 py-2 font-display text-xl text-ink outline-none transition-colors duration-300 placeholder:text-stone/60 focus:border-bordeaux";

export default function AuthPanel() {
  const panel = useAuth((s) => s.panel);
  // The panel is handed down as a prop: while the card fades out the store already says "closed" (null), and the
  // fading card must keep showing what it showed, not read the empty store (that crashed after Save and Sign out).
  return <AnimatePresence>{panel && <Card key="auth" panel={panel} />}</AnimatePresence>;
}

/** The guest book: sign in with Google or an emailed code, then leave a name, phone and address for delivery. */
function Card({ panel }: { panel: NonNullable<ReturnType<typeof useAuth.getState>["panel"]> }) {
  const close = useAuth((s) => s.close);
  const heading =
    panel.step === "profile"
      ? panel.reason === "address"
        ? "Deliver to"
        : "A few details"
      : panel.reason === "order"
        ? "Before we send it"
        : "The guest book";
  const lede =
    panel.step === "profile"
      ? "Where should we bring your order? You can change this whenever you order."
      : panel.reason === "order"
        ? "Sign in so the kitchen knows whose table this is and where to deliver it."
        : "Sign in to order to your door, and to be remembered next time.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-40 flex items-stretch justify-center bg-ink/65 sm:items-center sm:p-8"
      onClick={close}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.5, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-paper px-8 pb-10 pt-16 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:h-auto sm:max-h-[90vh] sm:px-14 sm:pt-16"
      >
        <button onClick={close} className="text-action absolute right-6 top-6 text-[10px] text-stone hover:text-ink sm:right-10 sm:top-8">
          Close
        </button>
        <p className="eyebrow text-stone">KNAK · Grand Café</p>
        <h2 className="mt-5 font-display text-[40px] italic leading-none">{heading}</h2>
        <p className="mt-5 max-w-sm font-display text-lg leading-relaxed text-ink/75">{lede}</p>
        <div className="mt-10 h-px w-12 bg-champagne" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={panel.step} {...swap} className="mt-10">
            {panel.step === "choose" && <Choose />}
            {panel.step === "email" && <EmailStep />}
            {panel.step === "code" && <CodeStep />}
            {panel.step === "profile" && <ProfileStep />}
          </motion.div>
        </AnimatePresence>
      </motion.section>
    </motion.div>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="mt-5 font-sans text-[12px] leading-relaxed text-bordeaux">{text}</p>;
}

function Choose() {
  const google = useAuth((s) => s.google);
  const setStep = useAuth((s) => s.setStep);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col items-start gap-7">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const e = await google();
          if (e) {
            setError(e);
            setBusy(false);
          }
        }}
        className="text-action text-[13px] text-ink"
      >
        Continue with Google <span className="arrow">→</span>
      </button>
      <button onClick={() => setStep("email")} className="text-action text-[13px] text-ink">
        Email me a code <span className="arrow">→</span>
      </button>
      <ErrorLine text={error} />
    </div>
  );
}

// The address typed on the email step, kept for the code step.
let lastEmail = "";

function EmailStep() {
  const sendCode = useAuth((s) => s.sendCode);
  const setStep = useAuth((s) => s.setStep);
  const [email, setEmail] = useState(lastEmail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        lastEmail = email.trim();
        setError(await sendCode(email));
        setBusy(false);
      }}
    >
      <label className="eyebrow block text-stone" htmlFor="auth-email">
        Your email
      </label>
      <input id="auth-email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
      <ErrorLine text={error} />
      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={() => setStep("choose")} className="text-action text-[10px] text-stone hover:text-ink">
          <span className="arrow">←</span> Back
        </button>
        <button type="submit" disabled={!valid || busy} className="text-action text-[13px] text-bordeaux">
          {busy ? "Sending" : "Send the code"} <span className="arrow">→</span>
        </button>
      </div>
    </form>
  );
}

function CodeStep() {
  const verifyCode = useAuth((s) => s.verifyCode);
  const sendCode = useAuth((s) => s.sendCode);
  const setStep = useAuth((s) => s.setStep);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = /^\d{6,8}$/.test(code.trim());
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        const err = await verifyCode(lastEmail, code);
        setError(err);
        setBusy(false);
      }}
    >
      <p className="font-sans text-[12px] font-light leading-relaxed text-stone">
        We sent a code to <span className="text-ink">{lastEmail}</span>. It may take a minute, and may land in spam.
      </p>
      <label className="eyebrow mt-8 block text-stone" htmlFor="auth-code">
        The code
      </label>
      <input
        id="auth-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={8}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
        className={`${field} tracking-[0.5em] tabular-nums`}
      />
      <ErrorLine text={error} />
      {note && <p className="mt-5 font-sans text-[12px] text-stone">{note}</p>}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={async () => {
            setNote(null);
            const err = await sendCode(lastEmail);
            if (err) setError(err);
            else setNote("A new code is on its way.");
          }}
          className="text-action text-[10px] text-stone hover:text-ink"
        >
          Send again
        </button>
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => setStep("email")} className="text-action text-[10px] text-stone hover:text-ink">
            Change email
          </button>
          <button type="submit" disabled={!valid || busy} className="text-action text-[13px] text-bordeaux">
            {busy ? "Checking" : "Sign in"} <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function ProfileStep() {
  const profile = useAuth((s) => s.profile);
  const user = useAuth((s) => s.user);
  const saveProfile = useAuth((s) => s.saveProfile);
  const signOut = useAuth((s) => s.signOut);
  const [p, setP] = useState<Profile>(profile ?? { name: "", phone: "", address: "", pincode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setP({ ...p, [k]: e.target.value });
  const ok = profileComplete(p);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok) {
          setError("Please add your name, a phone number, the full address and a 6-digit pincode.");
          return;
        }
        setBusy(true);
        setError(await saveProfile(p));
        setBusy(false);
      }}
      className="flex flex-col gap-8"
    >
      <div>
        <label className="eyebrow block text-stone" htmlFor="p-name">
          Name
        </label>
        <input id="p-name" autoComplete="name" value={p.name} onChange={set("name")} placeholder="As we should greet you" className={field} />
      </div>
      <div>
        <label className="eyebrow block text-stone" htmlFor="p-phone">
          Phone
        </label>
        <input id="p-phone" type="tel" autoComplete="tel" value={p.phone} onChange={set("phone")} placeholder="For the delivery rider" className={field} />
      </div>
      <div>
        <label className="eyebrow block text-stone" htmlFor="p-address">
          Address
        </label>
        <textarea
          id="p-address"
          autoComplete="street-address"
          rows={2}
          value={p.address}
          onChange={set("address")}
          placeholder="Flat, building, street, area"
          className={`${field} resize-none text-lg leading-snug`}
        />
      </div>
      <div>
        <label className="eyebrow block text-stone" htmlFor="p-pin">
          Pincode
        </label>
        <input
          id="p-pin"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={p.pincode}
          onChange={(e) => setP({ ...p, pincode: e.target.value.replace(/\D/g, "") })}
          placeholder="000000"
          className={`${field} max-w-[10rem] tabular-nums`}
        />
      </div>
      <ErrorLine text={error} />
      <div className="flex items-center justify-between">
        <button type="button" onClick={signOut} className="text-action text-[10px] text-stone hover:text-ink">
          Sign out{user?.email ? ` · ${user.email}` : ""}
        </button>
        <button type="submit" disabled={busy} className="text-action text-[13px] text-bordeaux">
          {busy ? "Saving" : "Save"} <span className="arrow">→</span>
        </button>
      </div>
    </form>
  );
}
