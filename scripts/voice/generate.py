"""
Records the staff's lines into public/voice/<clip>.mp3 with Kokoro, a free, open (Apache-2.0) voice model that runs
offline. The clip names match src/game/host.ts and src/game/service.ts; lines that mention a dish are recorded once
per dish in src/data/menu.ts, so re-run this after adding dishes. The guest's name is never recorded; only the
caption shows it.

  python3 -m pip install kokoro-onnx soundfile
  # model files: https://github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
  python3 scripts/voice/generate.py <folder with the model files>

Needs ffmpeg for the MP3s.
"""
import os, re, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "voice")

VOICES = {"host": "af_heart", "cashier": "am_michael", "waiter": "am_puck"}

# How the model should say names it would otherwise read as English words.
SAY = {"KNAK": "Knak", "Café au Lait": "Café oh Lay", "Coq au Vin": "Coke oh Van"}

menu = open(os.path.join(ROOT, "src", "data", "menu.ts"), encoding="utf-8").read()
dishes = re.findall(r'\{ id: "(\w+)", category: "[^"]+", name: "([^"]+)"', menu)

lines = [
    ("host-welcome", "host", "Hi, welcome to KNAK!"),
    ("host-on-way", "host", "Hi! Your order is on its way to you."),
    ("host-preparing", "host", "Hi! The kitchen is preparing your order right now."),
    ("host-ready", "host", "Hi! Your order is ready and leaving us shortly."),
    ("cashier-menu", "cashier", "Hello! Here is our menu. Everything is cooked fresh for delivery."),
    ("cashier-ready", "cashier", "Your order is ready! It is leaving our kitchen for your door now."),
]
for id, name in dishes:
    lines += [
        (f"host-fav-{id}", "host", f"Hi, welcome back! How was the {name} last time?"),
        (f"cashier-again-{id}", "cashier", f"Hello again! The {name} again, or something new tonight?"),
        (f"waiter-ready-{id}", "waiter", f"Your order is ready! The {name} is leaving our kitchen for your door now."),
    ]

model = sys.argv[1] if len(sys.argv) > 1 else "."
k = Kokoro(os.path.join(model, "kokoro-v1.0.onnx"), os.path.join(model, "voices-v1.0.bin"))
os.makedirs(OUT, exist_ok=True)
for clip, who, text in lines:
    spoken = text
    for a, b in SAY.items():
        spoken = spoken.replace(a, b)
    samples, rate = k.create(spoken, voice=VOICES[who], speed=0.95, lang="en-us")
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, samples, rate)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.15",
                        "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", os.path.join(OUT, f"{clip}.mp3")], check=True)
    print(clip, round(len(samples) / rate, 1), "s")
