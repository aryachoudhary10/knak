/**
 * Fetches the paintings that hang in the dining room's arches from Wikimedia Commons into public/paintings, at
 * build time (npm runs this before `next build`). All are public domain. A painting that can't be fetched is
 * simply left out: its arch keeps the mirror, and the build carries on.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "public", "paintings");
const COMMONS = "https://upload.wikimedia.org/wikipedia/commons/thumb";

export const PAINTINGS = {
  "cafe-terrace": "8/86/Van_Gogh_-_Terrace_of_a_Caf%C3%A9_at_Night_%28Place_du_Forum%29_1888.jpg",
  "the-kiss": "4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg",
};
/** Widths Wikimedia serves: the larger for computers, the smaller for phones. */
const WIDTHS = [960, 500];

mkdirSync(OUT, { recursive: true });
for (const [id, path] of Object.entries(PAINTINGS)) {
  for (const w of WIDTHS) {
    const file = join(OUT, `${id}-${w}.jpg`);
    if (existsSync(file)) continue;
    const name = path.split("/").pop();
    try {
      const res = await fetch(`${COMMONS}/${path}/${w}px-${name}`, { headers: { "User-Agent": "KNAK-site/1.0 (https://knak.vercel.app)" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`painting ${id} ${w}px fetched`);
    } catch (e) {
      console.warn(`painting ${id} ${w}px not fetched (${e.message}); its arch keeps the mirror`);
    }
  }
}
