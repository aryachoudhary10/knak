import { seeded, randomCharacter, type Character } from "@/lib/character";

/** World units are metres. The facade sits on z = 0, the street is z > 0, the dining room is z < 0. */
export const ROOM = { minX: -8, maxX: 8, minZ: -20, maxZ: 0, height: 6 } as const;
export const DOOR = { halfWidth: 1.2, height: 3.4 } as const;
/** Arched French windows in the left wall: open to the real garden and street outside, not a painted view. */
export const WINDOWS = { z: [-2.6, -8.6, -14.6], halfWidth: 0.8, sill: 1.0, spring: 4.4 } as const;
/** Arched windows above the banquette on the right wall, looking across the other garden. */
export const RIGHT_WINDOWS = { z: [-3.15, -6.6, -10.05, -13.45], halfWidth: 0.95, sill: 1.8, spring: 4.1 } as const;
/** The side walls run from the room's plaster face out to the pavilion's stone face, so each window is a deep reveal. */
export const LEFT_WALL = { inner: -8.0, outer: -10.4, back: -20.6, height: 8.2 } as const;
export const SIDE_WALL = LEFT_WALL;
export type WindowSet = { z: readonly number[]; halfWidth: number; sill: number; spring: number };
/**
 * The bar salon behind the dining room: through an arch in the back wall, across a short vestibule, up three
 * marble steps to a raised floor with an oval island bar, a lounge, a fireplace and a grand piano.
 */
export const SALON = { x0: -10, x1: 10, z0: -20.4, z1: -31, stepFrom: -22.0, stepTo: -23.2, floor: 0.5, height: 5.6 } as const;
/** Twin arches either side of the counter, so the salon is entered from either aisle and its way out is always in view. */
export const BAR_ARCH = { xs: [-6.2, 6.2], halfWidth: 1.2, spring: 3.2 } as const;
/** Spans of a wall from a to b with the bar arches cut out. */
export function archSpans(a: number, b: number, pad = 0): [number, number][] {
  const out: [number, number][] = [];
  let at = a;
  for (const x of BAR_ARCH.xs) {
    out.push([at, x - BAR_ARCH.halfWidth - pad]);
    at = x + BAR_ARCH.halfWidth + pad;
  }
  out.push([at, b]);
  return out;
}
export const ISLAND = { x: 0.8, z: -26.6, rx: 2.8, rz: 1.5, height: 1.1 } as const;
/** The gallery: a balcony over the entrance, reached by a round staircase at its left end. */
export const GALLERY = { x0: -6.6, x1: 6.6, z0: -0.45, z1: -3.0, deck: 3.5 } as const;
/**
 * The round staircase: one full turn about a gilt newel, climbing anticlockwise (seen from above). Guests step
 * on at its left side walking toward the entrance and step off at the same side, a floor higher, onto the gallery.
 */
export const SPIRAL = { x: -4.4, z: -3.6, r: 1.7, core: 0.22, start: -Math.PI / 2, treads: 28 } as const;
/** The winter garden: a glass house in the right-hand garden, entered from the bar salon through French doors. */
export const WINTER = { x0: 10.4, x1: 14.6, z0: -21.0, z1: -31.2, floor: 0.5, eaves: 3.9, ridge: 5.3, doorZ: -24.6, doorHalf: 0.8, doorH: 2.8 } as const;
export const FACADE = { halfWidth: 10, height: 8.2, thickness: 0.4 } as const;
/** Capsule centre resting on the pavement (half height 0.55 + radius 0.3), so the visitor never drops in. */
export const SPAWN = { x: 0, y: 0.86, z: 7.5 } as const;
export const COUNTER = { z: -15.6, halfWidth: 3.6, depth: 0.9, height: 1.1 } as const;
/** Where the visitor stands to order. */
export const COUNTER_SPOT = { x: 0, z: COUNTER.z + 1.4 } as const;

export type Table = { id: string; x: number; z: number; shape: "round" | "rect" | "bistro"; radius?: number; w?: number; d?: number };
export type Chair = { id: string; x: number; z: number; /** angle the seated person faces */ rot: number; outdoor?: boolean };
export type BanquetteSeat = { id: string; x: number; z: number; rot: number };

export const TABLES: Table[] = [];
export const CHAIRS: Chair[] = [];
export const BANQUETTE_SEATS: BanquetteSeat[] = [];

const facing = (fromX: number, fromZ: number, toX: number, toZ: number) => Math.atan2(toX - fromX, toZ - fromZ);

function roundTable(id: string, x: number, z: number, chairs: number, startAngle: number, radius = 0.55, outdoor = false) {
  TABLES.push({ id, x, z, shape: outdoor ? "bistro" : "round", radius });
  const r = radius + 0.42;
  for (let i = 0; i < chairs; i++) {
    const a = startAngle + (i * Math.PI * 2) / chairs;
    const cx = x + Math.sin(a) * r;
    const cz = z + Math.cos(a) * r;
    CHAIRS.push({ id: `${id}-c${i}`, x: cx, z: cz, rot: facing(cx, cz, x, z), outdoor });
  }
}

// Left column: round tables with three chairs, like the reference photo.
[-6.6, -9.8, -13.0].forEach((z, i) => roundTable(`L${i}`, -5.2, z, 3, Math.PI / 2 + 0.4));
// Small round tables either side of the runner, chairs set along the aisle so none stand on the carpet.
[-5.4, -9.0].forEach((z, i) => roundTable(`C${i}`, -2.3, z, 2, 0));
[-5.4, -9.0].forEach((z, i) => roundTable(`D${i}`, 2.3, z, 2, 0));

// Right column: square tables against the burgundy banquette.
[-3.0, -5.4, -7.8, -10.2, -12.6].forEach((z, i) => {
  const x = 6.45;
  TABLES.push({ id: `R${i}`, x, z, shape: "rect", w: 0.9, d: 0.9 });
  const cx = x - 0.95;
  CHAIRS.push({ id: `R${i}-c0`, x: cx, z, rot: facing(cx, z, x, z) });
  BANQUETTE_SEATS.push({ id: `R${i}-b0`, x: 7.35, z, rot: facing(7.35, z, x, z) });
});

// Outdoor bistro tables either side of the door.
roundTable("O0", -4.2, 2.3, 2, Math.PI / 2, 0.4, true);
roundTable("O1", 4.2, 2.3, 2, Math.PI / 2, 0.4, true);

export type Npc = {
  id: string;
  character: Character;
  x: number;
  z: number;
  rot: number;
  pose: "sit" | "stand";
  /** floor height under them, for the raised bar salon */
  y?: number;
  /** seated away from a dining table (lounge sofa, piano bench), so they don't lean toward one */
  lounge?: boolean;
  role?: string;
  label?: string;
};

/** Seated guests: a fixed, seeded selection so the room looks the same for everyone. */
function buildGuests(): Npc[] {
  const rnd = seeded(7);
  const guests: Npc[] = [];
  const takenChairs = new Set(["L0-c0", "L0-c1", "L2-c2", "C1-c0", "C1-c1", "D0-c0", "D0-c1", "R1-c0", "R3-c0", "O0-c1"]);
  for (const c of CHAIRS) {
    if (!takenChairs.has(c.id)) continue;
    guests.push({ id: `g-${c.id}`, character: randomCharacter(rnd), x: c.x, z: c.z, rot: c.rot, pose: "sit" });
  }
  const takenBanquette = new Set(["R0-b0", "R1-b0", "R3-b0", "R4-b0"]);
  for (const b of BANQUETTE_SEATS) {
    if (!takenBanquette.has(b.id)) continue;
    guests.push({ id: `g-${b.id}`, character: randomCharacter(rnd), x: b.x, z: b.z, rot: b.rot, pose: "sit" });
  }
  return guests;
}

/** Evening company in the bar salon: two at the bar, three in the lounge, and the pianist. */
function salonGuests(): Npc[] {
  const rnd = seeded(31);
  const f = SALON.floor;
  const at = (id: string, x: number, z: number, rot: number, pose: "sit" | "stand"): Npc => ({
    id, character: randomCharacter(rnd), x, z, rot, pose, y: f, lounge: pose === "sit",
  });
  return [
    at("s-bar0", ISLAND.x - 1.2, ISLAND.z + ISLAND.rz + 0.55, Math.PI + 0.2, "stand"),
    at("s-bar1", ISLAND.x - 0.55, ISLAND.z + ISLAND.rz + 0.6, Math.PI - 0.3, "stand"),
    at("s-lounge0", -9.3, -25.2, Math.PI / 2, "sit"),
    at("s-lounge1", -9.3, -26.4, Math.PI / 2, "sit"),
    at("s-lounge2", -9.3, -28.6, Math.PI / 2, "sit"),
    at("s-piano", 6.5, -27.1, Math.PI / 2, "sit"),
    // up in the gallery over the entrance
    { ...at("g-gal0", -1.05, -1.75, -Math.PI / 2, "sit"), y: GALLERY.deck },
    { ...at("g-gal1", -2.55, -1.75, Math.PI / 2, "sit"), y: GALLERY.deck },
    { ...at("g-gal2", 3.65, -1.75, Math.PI / 2, "sit"), y: GALLERY.deck },
    // a pair taking coffee among the palms in the winter garden
    at("w-0", 11.85, -28.3, Math.PI / 2, "sit"),
    at("w-1", 13.35, -28.3, -Math.PI / 2, "sit"),
  ];
}

export const GUESTS = [...buildGuests(), ...salonGuests()];
export const OCCUPIED_CHAIRS = new Set(GUESTS.map((g) => g.id.replace(/^g-/, "")));

export const STAFF: Npc[] = [
  {
    id: "host",
    character: { name: "Amélie", skin: "#e2b48f", hair: "#3b2416", hairStyle: "bun", top: "#1c1c1f", bottom: "#1c1c1f" },
    x: -1.5, z: -3.4, rot: facing(-1.5, -3.4, 0, 2), pose: "stand", role: "Host", label: "Amélie · Host",
  },
  {
    id: "cashier",
    character: { name: "Louis", skin: "#c98e64", hair: "#1d1410", hairStyle: "short", top: "#efe8d8", bottom: "#1c1c1f" },
    x: 0.6, z: COUNTER.z - 0.9, rot: 0, pose: "stand", role: "Counter", label: "Louis · Counter",
  },
  {
    id: "barista",
    character: { name: "Nisha", skin: "#a86d45", hair: "#1d1410", hairStyle: "long", top: "#efe8d8", bottom: "#1c1c1f" },
    x: -2.4, z: COUNTER.z - 1.0, rot: 0.3, pose: "stand", role: "Barista", label: "Nisha · Barista",
  },
  {
    id: "bartender",
    character: { name: "Hugo", skin: "#d2a07a", hair: "#2a1a10", hairStyle: "short", top: "#1c1c1f", bottom: "#1c1c1f" },
    x: ISLAND.x - 1.0, z: ISLAND.z + 0.5, rot: 0, pose: "stand", y: SALON.floor, role: "Bar", label: "Hugo · Bar",
  },
];

const WORDS = ["", "one", "two", "three", "four", "five", "six"];

/** How a table introduces itself in the contextual prompt: "TABLE 07", "FOR THREE · BY THE WINDOWS · TWO DINING". */
export function tableInfo(chairId: string) {
  const tableId = chairId.split("-")[0];
  const index = TABLES.findIndex((t) => t.id === tableId);
  const t = TABLES[index];
  const seats = [...CHAIRS, ...BANQUETTE_SEATS].filter((c) => c.id.startsWith(`${tableId}-`));
  const dining = seats.filter((c) => OCCUPIED_CHAIRS.has(c.id)).length;
  const place =
    t.shape === "bistro" ? "On the terrace" : t.shape === "rect" ? "On the banquette" : t.x < -3 ? "By the windows" : "Beneath the chandeliers";
  const meta = [`For ${WORDS[seats.length] ?? seats.length}`, place, dining > 0 ? `${WORDS[dining]} dining` : "Free tonight"];
  return { title: `Table ${String(index + 1).padStart(2, "0")}`, meta: meta.join(" · ") };
}

/** A guest waiting for a takeaway pickup at the end of the counter. */
export const WAITING_GUEST: Npc = {
  id: "waiting",
  character: { name: "Priya", skin: "#c98e64", hair: "#1d1410", hairStyle: "long", top: "#7b1f2a", bottom: "#1f1f24" },
  x: 3.3, z: COUNTER.z + 1.1, rot: Math.PI, pose: "stand", label: "Priya · waiting for order #0141",
};

/** The waiter walks this loop through the aisle. */
export const WAITER_PATH: [number, number][] = [
  [0.5, -2.5], [0.5, -12.6], [-0.5, -12.6], [-0.5, -2.5],
];

export const CHAIR_BY_ID = Object.fromEntries(CHAIRS.map((c) => [c.id, c]));
