# KNAK

A first-person 3D visit to KNAK, a Parisian-style grand café. Visitors start on the street, walk in through the glass doors, sit at any free table, and order at the counter from a menu card. Orders are for home delivery.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev
```

Open http://localhost:3000.

## Controls

| | Desktop | Phone |
| --- | --- | --- |
| Walk | W A S D or arrows (Shift to walk faster) | Left thumb joystick |
| Look | Mouse (click the scene first) | Drag on the right half |
| Sit, stand, order | E | Gold button |
| Free the mouse | Esc | |

## Where things live

- `src/game/layout.ts`: room size, table and chair positions, staff and guests
- `src/components/game/world/`: street, facade, dining room, furniture, counter, people
- `src/components/game/Player.tsx`: first-person movement, sitting, what you're looking at
- `src/components/ui/`: welcome card, HUD, menu card, touch controls
- `src/data/menu.ts`: sample menu (moves to Supabase so prices can be edited from the admin screen)

Everything is built from code (no downloaded 3D models yet), so the whole scene loads in one small bundle.
