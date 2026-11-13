"""Монтаж V2: 12 сцен, озвучка Qwen (qv2), подписи, тихая музыка. Оригинальные версии не трогаем."""
import glob, json, os, subprocess, wave
import numpy as np, soundfile as sf
import PIL.Image as I, PIL.ImageDraw as D, PIL.ImageFont as F

W = os.path.dirname(os.path.abspath(__file__))
Q = "C:/Users/БАЙСЕИТ/fp_tts/qv2"
REC = glob.glob(f"{W}/rec_v2/*.webm")[0]
OUT = os.path.join(W, "..", "FuturePath_AI_demo_FINAL_V2.mp4")
FONTB = r"C:\Windows\Fonts\segoeuib.ttf"
INK, MARK, PAPER = (18, 29, 38), (255, 216, 77), (244, 246, 248)
FPS = 30
M = json.load(open(f"{W}/rec_v2_marks.json"))
T = {k: v - M["s1_start"] for k, v in M.items()}
T["s6_start"] = 115.0  # страница цикла появляется на ~115 с записи (проверено по кадрам)
# сцены: (id, начало, конец записи, подпись)
SCENES = [
    ("s1", T["s1_start"], T["s2_start"], "Кем стать в эпоху ИИ?"),
    ("s2", T["s2_start"], T["s3_start"], "FuturePath AI: профориентация и подготовка к ИИ"),
    ("s3", T["s3_start"], T["s4_start"], "Тест интересов: 24 вопроса (ускорено)"),
    ("s4", T["s4_start"], T["s5_start"], "Топ-5 профессий с объяснением"),
    ("s5", T["s5_start"], T["s6_start"], "Сравнение и выбор профессии"),
    ("s6", T["s6_start"], T["s7_start"], "Переход к AI Readiness с рекомендуемым навыком"),
    ("s7", T["s7_start"], T["s8_start"], "Диагностика без ИИ"),
    ("s8", T["s8_start"], T["s9_start"], "Наставник объясняет ошибки"),
    ("s9", T["s9_start"], T["s10_start"], "Работа с настоящим ИИ: проверяем ответы"),
    ("s10", T["s10_start"], T["s11_start"], "Повторная проверка без ИИ"),
    ("s11", T["s11_start"], T["end"], "Карьерная карта: профессия, результаты, план"),
]


def run(c):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:])
        raise SystemExit("ffmpeg failed")


def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def caption(text, path):
    im = I.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = D.Draw(im)
    d.rectangle((0, 960, 1920, 1080), fill=INK + (255,))
    d.rectangle((0, 960, 1920, 964), fill=MARK + (255,))
    f = F.truetype(FONTB, 44)
    w = d.textlength(text, font=f)
    d.text(((1920 - w) / 2, 996), text, font=f, fill=(255, 255, 255, 255))
    im.save(path)


def narration(sid, total):
    """Фрагменты озвучки сцены склеиваются с короткими паузами; паузы растягиваются, чтобы речь шла по всей сцене (не дольше 1.2 с)."""
    parts = sorted(glob.glob(f"{Q}/{sid}_*.wav"), key=lambda p: int(p.rsplit("_", 1)[1].split(".")[0]))
    arrs = []
    for i, p in enumerate(parts):
        x, sr = sf.read(p)
        if x.ndim > 1:
            x = x.mean(axis=1)
        # обрезка тишины по краям
        idx = np.where(np.abs(x) > 0.01)[0]
        if len(idx):
            x = x[max(0, idx[0] - int(0.05 * sr)): idx[-1] + int(0.05 * sr)]
        arrs.append(x.astype(np.float32))
        sr_last = sr
    speech = sum(len(a) for a in arrs) / sr_last
    gap = 0.25 if len(arrs) < 2 else min(1.2, max(0.25, (total - 0.6 - speech) / (len(arrs) - 1)))
    seq = []
    for i, a in enumerate(arrs):
        seq.append(a)
        if i < len(arrs) - 1:
            seq.append(np.zeros(int(gap * sr_last), dtype=np.float32))
    raw = f"{W}/v2raw_{sid}.wav"
    sf.write(raw, np.concatenate(seq), sr_last)
    out = f"{W}/v2n_{sid}.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-17:TP=-2:LRA=7,aformat=sample_rates=44100:channel_layouts=stereo", out])
    os.remove(raw)
    return out


segs = []
report = []
# титул (без речи), 2.5 с
card = f"{W}/v2_title.png"
im = I.new("RGB", (1920, 1080), PAPER)
d = D.Draw(im)
for x in range(0, 1920, 48):
    d.line((x, 0, x, 1080), fill=(226, 231, 236), width=1)
for y in range(0, 1080, 48):
    d.line((0, y, 1920, y), fill=(226, 231, 236), width=1)
d.rectangle((200, 420, 214, 700), fill=MARK)
d.text((250, 400), "FuturePath AI", font=F.truetype(FONTB, 118), fill=INK)
d.text((254, 560), "Подготовка к работе в эпоху ИИ", font=F.truetype(FONTB, 52), fill=(67, 83, 97))
d.text((254, 650), "National Founder Cup Shymkent 2026 · THE HUMAN FUTURE", font=F.truetype(FONTB, 34), fill=(91, 107, 120))
im.save(card)
run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", "2.5", "-i", card, "-f", "lavfi", "-t", "2.5", "-i", "anullsrc=r=44100:cl=stereo",
     "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", f"{W}/v2seg_title.mp4"])
segs.append(f"{W}/v2seg_title.mp4")
total = 2.5

for sid, a, b, cap in SCENES:
    vd = b - a
    nar = narration(sid, vd)
    q = wav_dur(nar)
    D_ = max(q + 0.8, 3.0)
    sp = max(1.0, vd / D_)          # слишком длинный кусок записи ускоряем, короткий — держим последний кадр
    run_d = vd / sp
    pad = f",tpad=stop_mode=clone:stop_duration={max(0.0, D_ - run_d):.3f}" if D_ - run_d > 0.02 else ""
    capp = f"{W}/v2cap_{sid}.png"
    caption(cap, capp)
    out = f"{W}/v2seg_{sid}.mp4"
    filt = (f"[0:v]setpts=PTS/{sp:.4f},fps={FPS},scale=1920:960,pad=1920:1080:0:0:color=0x121D26{pad},"
            f"fade=t=in:st=0:d=0.3,fade=t=out:st={D_ - 0.3:.3f}:d=0.3[b];"
            f"[1:v]fade=t=in:st=0.1:d=0.25:alpha=1,fade=t=out:st={D_ - 0.4:.3f}:d=0.3:alpha=1[c];[b][c]overlay=0:0[v];"
            f"[2:a]adelay=400|400,apad,atrim=0:{D_:.3f},aformat=sample_rates=44100:channel_layouts=stereo[a]")
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{a + 0.2:.3f}", "-t", f"{vd - 0.2:.3f}", "-i", REC,
         "-loop", "1", "-t", f"{D_:.3f}", "-i", capp, "-i", nar,
         "-filter_complex", filt, "-map", "[v]", "-map", "[a]", "-t", f"{D_:.3f}", "-r", str(FPS),
         "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", out])
    segs.append(out)
    total += D_
    report.append((sid, round(vd, 1), round(q, 1), round(D_, 1), round(sp, 2)))

# финал: закрывающая карточка с озвучкой s12
s12 = narration("s12", 0)
d12 = wav_dur(s12) + 2.0
card_end = f"{W}/v2_end.png"
im = I.new("RGB", (1920, 1080), PAPER)
d = D.Draw(im)
for x in range(0, 1920, 48):
    d.line((x, 0, x, 1080), fill=(226, 231, 236), width=1)
for y in range(0, 1080, 48):
    d.line((0, y, 1920, y), fill=(226, 231, 236), width=1)
d.rectangle((200, 420, 214, 640), fill=MARK)
d.text((250, 400), "FuturePath AI", font=F.truetype(FONTB, 118), fill=INK)
d.text((254, 560), "Проверь навыки. Научись работать с ИИ. Увидь прогресс.", font=F.truetype(FONTB, 46), fill=(67, 83, 97))
d.text((254, 650), "Учебный прототип. Результаты в видео — тестовое прохождение.", font=F.truetype(FONTB, 32), fill=(91, 107, 120))
im.save(card_end)
out = f"{W}/v2seg_end.mp4"
run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", f"{d12:.3f}", "-i", card_end, "-i", s12,
     "-filter_complex", f"[0:v]fps={FPS},fade=t=in:st=0:d=0.5,fade=t=out:st={d12 - 0.6:.3f}:d=0.6[v];[1:a]adelay=500|500,apad,atrim=0:{d12:.3f},aformat=sample_rates=44100:channel_layouts=stereo[a]",
     "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", out])
segs.append(out)
total += d12
for r in report:
    print("сцена %s: запись %.1f с, речь %.1f с, в ролике %.1f с, ускорение %.2fx" % r)
print("итого, с: %.1f" % total)

# склейка видео и голоса
lst = f"{W}/v2_list.txt"
open(lst, "w", encoding="utf-8").write("".join(f"file '{p.replace(chr(92), '/')}'\n" for p in segs))
run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", f"{W}/v2joined.mp4"])

# музыка: тихая, на всю длину (тот же синтез, что и раньше), подсидчейн под речь
sr = 44100
n = int(sr * (total + 1))
t = np.arange(n) / sr
chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
sig = np.zeros(n)
seg_len = 7.0
for i in range(int(total / seg_len) + 2):
    ch = chords[i % 4]
    a = int(i * seg_len * sr)
    b = min(n, int((i + 1) * seg_len * sr + 2 * sr))
    if a >= n:
        break
    tt = t[a:b] - i * seg_len
    env = np.clip(tt / 2.0, 0, 1) * np.clip((seg_len + 2 - tt) / 2.0, 0, 1)
    for f in ch:
        sig[a:b] += env * (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * (f * 2.003) * tt)) / len(ch)
sig = sig / np.max(np.abs(sig)) * 0.9
fade = np.clip(t / 2.0, 0, 1) * np.clip((t[-1] - t) / 3.0, 0, 1)
sig *= fade
st = np.stack([sig, np.roll(sig, 400)], axis=1)
with wave.open(f"{W}/v2music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype("<i2").tobytes())

run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/v2joined.mp4", "-i", f"{W}/v2music.wav",
     "-filter_complex", "[1:a]volume=0.07[m];[0:a]asplit=2[v][k];[m][k]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=500[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[a]",
     "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", OUT])
print("готово:", os.path.abspath(OUT))
