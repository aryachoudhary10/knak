/**
 * The staff's voices: a line of text in, natural speech (MP3) out, from Google Cloud Text-to-Speech with Indian
 * English voices. Needs GOOGLE_TTS_API_KEY; without it this answers 404 and the browser's own voice is used instead.
 * Each line is cached at Vercel's edge for a year, so a greeting heard by many guests is synthesised only once.
 */

const VOICES = {
  f: [process.env.TTS_VOICE_FEMALE ?? "en-IN-Chirp3-HD-Aoede", "en-IN-Neural2-A"],
  m: [process.env.TTS_VOICE_MALE ?? "en-IN-Chirp3-HD-Charon", "en-IN-Neural2-B"],
};

export async function GET(request: Request) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return new Response("voice not configured", { status: 404 });
  const url = new URL(request.url);
  const text = (url.searchParams.get("t") ?? "").trim();
  const who = url.searchParams.get("v") === "m" ? "m" : "f";
  // Short staff lines only: this is not a general text-to-speech service.
  if (!text || text.length > 160) return new Response("bad request", { status: 400 });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response("forbidden", { status: 403 });

  for (const name of VOICES[who]) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-IN", name },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
      }),
    });
    if (!res.ok) continue;
    const { audioContent } = (await res.json()) as { audioContent?: string };
    if (!audioContent) continue;
    return new Response(Buffer.from(audioContent, "base64"), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
    });
  }
  return new Response("voice unavailable", { status: 502 });
}
