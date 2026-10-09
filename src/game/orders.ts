import { supabase } from "@/lib/supabase";
import type { Profile } from "./auth";
import type { CartLine } from "./store";
import { currentRef } from "./ref";

export type PlacedOrder = { id: string; number: number; total: number };

/**
 * Sends the guest's table to the kitchen. Called only after they confirm they have paid; the database prices every
 * line itself (place_order in supabase/migrations/20261007_orders.sql), so the total can't be changed from here.
 */
export async function placeOrder(cart: CartLine[], p: Profile): Promise<{ order: PlacedOrder } | { error: string }> {
  const sb = supabase();
  if (!sb) return { error: "Ordering isn’t available just now." };
  const args = {
    p_items: cart.map((l) => ({ id: l.itemId, qty: l.qty })),
    p_name: p.name,
    p_phone: p.phone,
    p_address: p.address,
    p_pincode: p.pincode,
  };
  // The creator who sent this guest, if any, is credited with the order.
  const ref = currentRef();
  const { data, error } = await sb.rpc("place_order", ref ? { ...args, p_ref: ref } : args);
  if (error) {
    if (/failed to fetch|network/i.test(error.message)) return { error: "We couldn’t reach KNAK just now. Please check your connection and try again." };
    return { error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "The order didn’t go through. Please try again." };
  return { order: { id: row.order_id, number: row.order_number, total: row.order_total } };
}
