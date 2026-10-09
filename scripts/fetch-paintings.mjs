/**
 * Fetches the paintings in the dining room's arches and on its ceiling from Wikimedia Commons into public/paintings, at
 * build time (npm runs this before `next build`). All are public domain. A painting that can't be fetched is
 * simply left out: its place keeps what was there before, and the build carries on.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "public", "paintings");
const COMMONS = "https://upload.wikimedia.org/wikipedia/commons/thumb";

/** id → [path on Commons, widths to fetch]. Wikimedia serves only some widths (500, 960, 1280 among them). */
export const PAINTINGS = {
  // the arches on the left wall: 960 px for computers, 500 px for phones
  "cafe-terrace": ["8/86/Van_Gogh_-_Terrace_of_a_Caf%C3%A9_at_Night_%28Place_du_Forum%29_1888.jpg", [960, 500]],
  "the-kiss": ["4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg", [960, 500]],
  // the ceiling frescoes, larger because they span the room: 1280 px for computers, 960 px for phones
  aurora: ["0/0b/Guido_Reni_-_L%27Aurora_di_Guido_Reni_nelle_arti_decorative.jpg", [1280, 960]],
  "creation-of-adam": ["5/5b/Michelangelo_-_Creation_of_Adam_%28cropped%29.jpg", [1280, 960]],
  "triumph-of-venus": ["a/a3/The_Triumph_of_Venus%2C_by_Fran%C3%A7ois_Boucher.jpg", [1280, 960]],
};

mkdirSync(OUT, { recursive: true });
for (const [id, [path, widths]] of Object.entries(PAINTINGS)) {
  for (const w of widths) {
    const file = join(OUT, `${id}-${w}.jpg`);
    if (existsSync(file)) continue;
    const name = path.split("/").pop();
    try {
      const res = await fetch(`${COMMONS}/${path}/${w}px-${name}`, { headers: { "User-Agent": "KNAK-site/1.0 (https://knak.vercel.app)" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`painting ${id} ${w}px fetched`);
    } catch (e) {
      console.warn(`painting ${id} ${w}px not fetched (${e.message}); its place keeps what was there before`);
    }
  }
}
