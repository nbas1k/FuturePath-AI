import json, os, subprocess, glob
import numpy as np, wave
import PIL.Image as I, PIL.ImageDraw as D, PIL.ImageFont as F
W = os.path.dirname(os.path.abspath(__file__))
REC = glob.glob(f"{W}/rec_new/*.webm")[0]
OLD = os.path.join(W, "..", "FuturePath_AI_demo_Qwen.mp4")
OUT = os.path.join(W, "..", "FuturePath_AI_demo_FINAL.mp4")
FONTB = r"C:\Windows\Fonts\segoeuib.ttf"
INK, MARK = (18, 29, 38), (255, 216, 77)
m = json.load(open(f"{W}/newrec_marks.json"))
t = {k: v - m["home"] for k, v in m.items()}
def run(c):
    r = subprocess.run(c, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1200:]); raise SystemExit("fail")
def cap(text, path):
    im = I.new("RGBA", (1920, 1080), (0, 0, 0, 0)); d = D.Draw(im)
    d.rectangle((0, 960, 1920, 1080), fill=INK + (255,)); d.rectangle((0, 960, 1920, 964), fill=MARK + (255,))
    f = F.truetype(FONTB, 42); w = d.textlength(text, font=f)
    d.text(((1920 - w) / 2, 1000), text, font=f, fill=(255, 255, 255, 255)); im.save(path)
# сцены: (имя, начало в записи, конец, скорость, подпись)
scenes = [
    ("n_home", 0.0, t["test"] - 0.2, 1.0, "Два пути: профориентация или сразу AI Readiness"),
    ("n_test", t["test"], t["top5"], 4.0, "Тест интересов: 24 вопроса, ускорено"),
    ("n_top5", t["top5"], t["compare"], 1.0, "Топ-5 профессий с объяснением для каждой"),
    ("n_cmp", t["compare"], t["choose"], 1.0, "Сравнение рекомендованных профессий"),
    ("n_choose", t["choose"], t["cycle"], 1.0, "Выбираем профессию: AI Readiness с рекомендуемого навыка"),
    ("n_cycle", t["cycle"], t["career"], 1.0, "Диагностика навыка без ИИ"),
    ("n_career", t["career"], t["end"], 1.0, "Карьерная карта: результаты, пробелы и план"),
]
parts = []
total = 0.0
for name, a, b, sp, text in scenes:
    d_real = b - a; d_out = d_real / sp; total += d_out
    cap(text, f"{W}/{name}.png")
    out = f"{W}/{name}.mp4"
    filt = (f"[0:v]setpts=PTS/{sp},fps=30,scale=1920:960,pad=1920:1080:0:0:color=0x121D26[b];"
            f"[1:v][b]overlay=0:0,format=yuv420p[v]")
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{a:.3f}", "-t", f"{d_real:.3f}", "-i", REC,
         "-i", f"{W}/{name}.png", "-filter_complex", f"[0:v]setpts=PTS/{sp},fps=30,scale=1920:960,pad=1920:1080:0:0:color=0x121D26[b];[b][1:v]overlay=0:0[v]",
         "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", out])
    parts.append(out)
print("новый блок, сек:", round(total, 1))
# блок без озвучки: тихая музыка из того же источника, что и в старом ролике
sr = 48000; n = int(sr * total)
mus = f"{W}/newmusic.wav"
run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/qmusic.wav", "-t", f"{total:.3f}", "-af", "volume=0.10,afade=t=in:d=1,afade=t=out:st=%.3f:d=1.5" % (total - 1.5), "-ar", "48000", "-ac", "2", mus])
# склейка видео: титул старого ролика (0..3.5), новый блок, остальное старое
lst = f"{W}/fin_list.txt"
open(lst, "w", encoding="utf-8").write("")
run(["ffmpeg", "-y", "-loglevel", "error", "-i", OLD, "-t", "3.5", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-ar", "48000", "-ac", "2", f"{W}/fin_title.mp4"])
newcat = []
for p in parts: newcat.append(p)
run(["ffmpeg", "-y", "-loglevel", "error"] + sum([["-i", p] for p in parts], []) + ["-filter_complex", "".join(f"[{i}:v]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=0[nv]", "-map", "[nv]", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", f"{W}/fin_new.mp4"])
# видео: титул, новый блок, старые сцены (без титула)
open(lst, "w", encoding="utf-8").write("".join(f"file '{p.replace(chr(92), '/')}'\n" for p in [f"{W}/fin_title.mp4", f"{W}/fin_new.mp4"]))
run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/fin_title.mp4", "-i", f"{W}/fin_new.mp4", "-i", OLD,
     "-i", mus, "-filter_complex",
     f"[0:v][1:v]concat=n=2:v=1:a=0[v0];[2:v]trim=start=3.5,setpts=PTS-STARTPTS[oldv];[v0][oldv]concat=n=2:v=1:a=0[v];"
     f"[0:a]atrim=0:3.5,asetpts=PTS-STARTPTS[ta];[3:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS[na];"
     f"[2:a]atrim=start=3.5,asetpts=PTS-STARTPTS[oa];[ta][na][oa]concat=n=3:v=0:a=1[a]",
     "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
     "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", OUT])
print("готово:", os.path.abspath(OUT))
