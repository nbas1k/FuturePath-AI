"""Монтаж демо-видео FuturePath AI: титул, сцены с подписями и озвучкой, финальная карточка, фоновая музыка (синтезирована здесь, лицензия не нужна)."""
import glob, json, os, subprocess, wave
import numpy as np
import PIL.Image as I, PIL.ImageDraw as D, PIL.ImageFont as F

W = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(W, "..", "FuturePath_AI_demo.mp4")
FONT = r"C:\Windows\Fonts\segoeui.ttf"
FONTB = r"C:\Windows\Fonts\segoeuib.ttf" if os.path.exists(r"C:\Windows\Fonts\segoeuib.ttf") else r"C:\Windows\Fonts\arialbd.ttf"
scenes = json.load(open(f"{W}/scenes.json", encoding="utf-8"))
tl = {t["id"]: t for t in json.load(open(f"{W}/timeline.json", encoding="utf-8"))["timeline"]}
rec = glob.glob(f"{W}/rec/*.webm")[0]
FPS = 30
INK, PAPER, MARK, TEAL = (18, 29, 38), (244, 246, 248), (255, 216, 77), (20, 89, 95)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:]); raise SystemExit("ffmpeg failed")

def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()

def wrap(draw, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur)
    return lines

def caption_png(text, path):
    """Нижняя полоса 1920x120 под видео: подпись не закрывает страницу."""
    im = I.new("RGBA", (1920, 1080), (0, 0, 0, 0)); d = D.Draw(im)
    d.rectangle((0, 960, 1920, 1080), fill=INK + (255,))
    d.rectangle((0, 960, 1920, 964), fill=MARK + (255,))
    f = F.truetype(FONTB, 42)
    lines = wrap(d, text, f, 1700)
    if len(lines) > 1:
        f = F.truetype(FONTB, 34); lines = wrap(d, text, f, 1750)
    lh = 46; y0 = 960 + 4 + (116 - lh * len(lines)) // 2
    for i, l in enumerate(lines):
        w = d.textlength(l, font=f)
        d.text(((1920 - w) / 2, y0 + i * lh), l, font=f, fill=(255, 255, 255, 255))
    im.save(path)

def card_png(path, title, sub, small, extra=None):
    im = I.new("RGB", (1920, 1080), PAPER); d = D.Draw(im)
    # графическая бумага
    for x in range(0, 1920, 48): d.line((x, 0, x, 1080), fill=(226, 231, 236), width=1)
    for y in range(0, 1080, 48): d.line((0, y, 1920, y), fill=(226, 231, 236), width=1)
    ft, fs, fm = F.truetype(FONTB, 118), F.truetype(FONT, 52), F.truetype(FONT, 34)
    d.rectangle((200, 420, 214, 700), fill=MARK)
    d.text((250, 400), title, font=ft, fill=INK)
    d.text((254, 560), sub, font=fs, fill=(67, 83, 97))
    d.text((254, 650), small, font=fm, fill=(91, 107, 120))
    if extra:
        d.text((254, 740), extra, font=fm, fill=TEAL)
    # линейка
    y = 900
    d.line((250, y, 1670, y), fill=INK, width=5)
    for i in range(13): d.line((250 + i * 1420 / 12, y - 22, 250 + i * 1420 / 12, y), fill=(120, 134, 146), width=2)
    d.rectangle((250 + 1420 / 3, y - 14, 1670, y - 4), fill=MARK)
    d.line((250 + 1420 / 3, y - 44, 250 + 1420 / 3, y + 8), fill=(91, 107, 120), width=4)
    d.line((1670, y - 44, 1670, y + 8), fill=TEAL, width=8)
    im.save(path)

# ---- карточки и подписи
card_png(f"{W}/card_title.png", "FuturePath AI", "Подготовка к работе в эпоху ИИ", "National Founder Cup Shymkent 2026 · THE HUMAN FUTURE · Melon team")
card_png(f"{W}/card_end.png", "FuturePath AI", "Проверь навыки. Научись работать с ИИ. Увидь прогресс.", "Учебный прототип. Результаты в видео — тестовое прохождение, не статистика.", "Из 27 функций: 20 работают, 3 частично, 4 не реализованы")
for s in scenes:
    caption_png(s["caption"], f"{W}/cap_{s['id']}.png")

segs = []
def seg(name, inputs, filt, dur, audio):
    path = f"{W}/seg_{name}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inputs + ["-filter_complex", filt, "-map", "[v]", "-map", "[a]", "-t", f"{dur:.3f}",
           "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", path]
    run(cmd); segs.append(path)

FADE = 0.3
# титул 3.5 с без озвучки
seg("title", ["-loop", "1", "-t", "3.5", "-i", f"{W}/card_title.png", "-f", "lavfi", "-t", "3.5", "-i", "anullsrc=r=44100:cl=stereo"],
    f"[0:v]fps={FPS},fade=t=in:st=0:d=0.6,fade=t=out:st=3.0:d=0.5[v];[1:a]anull[a]", 3.5, None)

total = 3.5
for s in scenes:
    sid = s["id"]
    if sid == "s12": continue
    t = tl[sid]; start = t["start"] + 0.2; d = t["end"] - start
    nar = f"{W}/{sid}.wav"
    inputs = ["-ss", f"{start:.3f}", "-t", f"{d:.3f}", "-i", rec, "-loop", "1", "-t", f"{d:.3f}", "-i", f"{W}/cap_{sid}.png", "-i", nar]
    filt = (f"[0:v]fps={FPS},scale=1920:960,pad=1920:1080:0:0:color=0x121D26,fade=t=in:st=0:d={FADE},fade=t=out:st={d - FADE:.3f}:d={FADE}[b];"
            f"[1:v]fade=t=in:st=0.2:d=0.3:alpha=1,fade=t=out:st={d - 0.5:.3f}:d=0.3:alpha=1[c];[b][c]overlay=0:0[v];"
            f"[2:a]adelay=500|500,apad,atrim=0:{d:.3f},aformat=sample_rates=44100:channel_layouts=stereo[a]")
    seg(sid, inputs, filt, d, nar); total += d

# финал: карточка с озвучкой s12
d12 = wav_dur(f"{W}/s12.wav") + 2.5
inputs = ["-loop", "1", "-t", f"{d12:.3f}", "-i", f"{W}/card_end.png", "-i", f"{W}/s12.wav"]
filt = (f"[0:v]fps={FPS},fade=t=in:st=0:d=0.6,fade=t=out:st={d12 - 0.8:.3f}:d=0.8[v];"
        f"[1:a]adelay=700|700,apad,atrim=0:{d12:.3f},aformat=sample_rates=44100:channel_layouts=stereo[a]")
seg("end", inputs, filt, d12, None); total += d12
print(f"итого {total:.1f} с")

# ---- склейка
lst = f"{W}/list.txt"
open(lst, "w", encoding="utf-8").write("".join(f"file '{p.replace(chr(92), '/')}'\n" for p in segs))
run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", f"{W}/joined.mp4"])

# ---- музыка: тихий пэд (синтез numpy), без внешних файлов и лицензий
sr = 44100; n = int(sr * (total + 1)); t = np.arange(n) / sr
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
sig = np.zeros(n)
seg_len = 7.0
for i in range(int(total / seg_len) + 2):
    ch = chords[i % 4]
    a, b = int(i * seg_len * sr), min(n, int((i + 1) * seg_len * sr + 2 * sr))
    if a >= n: break
    tt = t[a:b] - i * seg_len
    env = np.clip(tt / 2.0, 0, 1) * np.clip((seg_len + 2 - tt) / 2.0, 0, 1)
    for f in ch:
        sig[a:b] += env * (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * (f * 2.003) * tt) * 0.4) / len(ch)
sig *= (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
sig = sig / np.max(np.abs(sig)) * 0.9
fade = np.clip(t / 3.0, 0, 1) * np.clip((t[-1] - t) / 4.0, 0, 1)
sig *= fade
st = np.stack([sig, np.roll(sig, 400)], axis=1)
with wave.open(f"{W}/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype("<i2").tobytes())

run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/joined.mp4", "-i", f"{W}/music.wav",
     "-filter_complex", "[1:a]volume=0.11[m];[0:a]volume=1.0[v];[v][m]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]",
     "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", OUT])
print("готово:", os.path.abspath(OUT))
