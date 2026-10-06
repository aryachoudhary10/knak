/**
 * Stub menu. This will move to the Supabase `menu_items` table so the owner can
 * edit items and prices from the admin screen without a code change.
 */
export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number; // rupees
  veg: boolean;
  available: boolean;
};

export const CATEGORIES = ["Starters", "Mains", "Desserts", "Drinks"] as const;

export const MENU: MenuItem[] = [
  { id: "s1", category: "Starters", name: "French Onion Soup", description: "Slow-cooked onions, gruyère crouton", price: 345, veg: true, available: true },
  { id: "s2", category: "Starters", name: "Truffle Fries", description: "Parmesan, truffle oil, aioli", price: 295, veg: true, available: true },
  { id: "s3", category: "Starters", name: "Chicken Liver Pâté", description: "Brioche toast, cornichons", price: 425, veg: false, available: true },
  { id: "m1", category: "Mains", name: "Coq au Vin", description: "Chicken braised in red wine, mash", price: 795, veg: false, available: true },
  { id: "m2", category: "Mains", name: "Wild Mushroom Risotto", description: "Porcini, parmesan, thyme", price: 645, veg: true, available: true },
  { id: "m3", category: "Mains", name: "Croque Monsieur", description: "Ham, béchamel, gruyère, sourdough", price: 525, veg: false, available: true },
  { id: "m4", category: "Mains", name: "Ratatouille Gratin", description: "Provençal vegetables, herb crust", price: 575, veg: true, available: true },
  { id: "d1", category: "Desserts", name: "Crème Brûlée", description: "Madagascar vanilla, burnt sugar", price: 365, veg: true, available: true },
  { id: "d2", category: "Desserts", name: "Chocolate Fondant", description: "Molten centre, vanilla ice cream", price: 395, veg: true, available: true },
  { id: "d3", category: "Desserts", name: "Macaron Box", description: "Six assorted macarons", price: 450, veg: true, available: false },
  { id: "b1", category: "Drinks", name: "Café au Lait", description: "Double shot, steamed milk", price: 225, veg: true, available: true },
  { id: "b2", category: "Drinks", name: "Fresh Citron Pressé", description: "Lemon, sugar syrup, soda", price: 195, veg: true, available: true },
];

export const menuById = Object.fromEntries(MENU.map((m) => [m.id, m]));

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
