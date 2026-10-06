import { seeded, randomCharacter, type Character } from "@/lib/character";

/** World units are metres. The facade sits on z = 0, the street is z > 0, the dining room is z < 0. */
export const ROOM = { minX: -8, maxX: 8, minZ: -20, maxZ: 0, height: 6 } as const;
export const DOOR = { halfWidth: 1.2, height: 3.4 } as const;
export const FACADE = { halfWidth: 10, height: 8.2, thickness: 0.4 } as const;
export const SPAWN = { x: 0, y: 1.1, z: 7.5 } as const;
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
[-3.6, -7.2, -10.8].forEach((z, i) => roundTable(`L${i}`, -5.2, z, 3, Math.PI / 2 + 0.4));
// Centre pair of small round tables.
[-5.4, -9.0].forEach((z, i) => roundTable(`C${i}`, -1.9, z, 2, Math.PI / 2));

// Right column: square tables against the burgundy banquette.
[-3.0, -5.4, -7.8, -10.2, -12.6].forEach((z, i) => {
  const x = 6.1;
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
  role?: string;
  label?: string;
};

/** Seated guests: a fixed, seeded selection so the room looks the same for everyone. */
function buildGuests(): Npc[] {
  const rnd = seeded(7);
  const guests: Npc[] = [];
  const takenChairs = new Set(["L0-c0", "L0-c1", "L2-c2", "C1-c0", "C1-c1", "R1-c0", "R3-c0", "O0-c1"]);
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

export const GUESTS = buildGuests();
export const OCCUPIED_CHAIRS = new Set(GUESTS.map((g) => g.id.replace(/^g-/, "")));

export const STAFF: Npc[] = [
  {
    id: "host",
    character: { name: "Amélie", skin: "#e2b48f", hair: "#3b2416", hairStyle: "bun", top: "#1c1c1f", bottom: "#1c1c1f" },
    x: -2.3, z: -1.6, rot: facing(-2.3, -1.6, 0, 2), pose: "stand", role: "Host", label: "Amélie · Host",
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
];

/** A guest waiting for a takeaway pickup at the end of the counter. */
export const WAITING_GUEST: Npc = {
  id: "waiting",
  character: { name: "Priya", skin: "#c98e64", hair: "#1d1410", hairStyle: "long", top: "#7b1f2a", bottom: "#1f1f24" },
  x: 3.3, z: COUNTER.z + 1.1, rot: Math.PI, pose: "stand", label: "Priya · waiting for order #0141",
};

/** The waiter walks this loop through the aisle. */
export const WAITER_PATH: [number, number][] = [
  [0.4, -2.5], [0.4, -12.5], [4.0, -12.8], [4.0, -2.8],
];

export const CHAIR_BY_ID = Object.fromEntries(CHAIRS.map((c) => [c.id, c]));
