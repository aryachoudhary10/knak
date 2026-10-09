/**
 * KNAK's own UPI account, set in Vercel as NEXT_PUBLIC_UPI_ID (e.g. "knak@okaxis") and NEXT_PUBLIC_UPI_NAME. Until it
 * is set, the payment page shows a sample code that pays no one.
 */
export const UPI_ID = (process.env.NEXT_PUBLIC_UPI_ID ?? "").trim();
export const UPI_NAME = (process.env.NEXT_PUBLIC_UPI_NAME ?? "").trim() || "KNAK Grand Cafe";

/** The standard UPI payment link: opens GPay, PhonePe, Paytm or any UPI app with the amount already filled in. */
export function upiLink(amount: number) {
  // The UPI ID goes in as written (some apps don't decode an escaped "@"); the rest is URL-encoded.
  const e = encodeURIComponent;
  return `upi://pay?pa=${UPI_ID}&pn=${e(UPI_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${e("KNAK order")}`;
}

/** A UPI reference (UTR) is 12 digits; people often paste it with spaces. */
export const cleanUtr = (s: string) => s.replace(/\D/g, "").slice(0, 12);
