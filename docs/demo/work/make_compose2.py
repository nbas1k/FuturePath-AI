import os
W = os.path.dirname(os.path.abspath(__file__))
s = open(f'{W}/compose.py', encoding='utf-8').read()

s = s.replace('OUT = os.path.join(W, "..", "FuturePath_AI_demo.mp4")', 'OUT = os.path.join(W, "..", "FuturePath_AI_demo_Qwen.mp4")\nQ = "C:/Users/БАЙСЕИТ/fp_tts/out"')
s = s.replace('path = f"{W}/seg_{name}.mp4"', 'path = f"{W}/qseg_{name}.mp4"')
s = s.replace('f"{W}/joined.mp4"', 'f"{W}/qjoined.mp4"').replace('f"{W}/music.wav"', 'f"{W}/qmusic.wav"').replace('f"{W}/list.txt"', 'f"{W}/qlist.txt"')

helper = '''
def narration(sid):
    """Фрагменты Qwen TTS одной сцены -> один файл: обрезка тишины по краям, короткие паузы, единая громкость."""
    parts = sorted(glob.glob(f"{Q}/{sid}_*.wav"), key=lambda p: int(p.rsplit("_", 1)[1].split(".")[0]))
    assert parts, f"нет озвучки для {sid}"
    out = f"{W}/q_{sid}.wav"
    n = len(parts)
    ins = []
    for p in parts: ins += ["-i", p]
    chains = []
    for i in range(n):
        chains.append(f"[{i}:a]silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,aresample=48000,aformat=channel_layouts=mono,apad=pad_dur=0.28[p{i}]")
    cat = "".join(f"[p{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,loudnorm=I=-17:TP=-2:LRA=7,aformat=sample_rates=44100:channel_layouts=stereo[o]"
    run(["ffmpeg", "-y", "-loglevel", "error"] + ins + ["-filter_complex", ";".join(chains) + ";" + cat, "-map", "[o]", out])
    return out

'''
s = s.replace("def wrap(draw, text, font, maxw):", helper + "def wrap(draw, text, font, maxw):", 1)

a = s.index("total = 3.5")
b = s.index("# финал: карточка с озвучкой s12")
scene_block = '''total = 3.5
report = []
for s_ in scenes:
    sid = s_["id"]
    if sid == "s12": continue
    t = tl[sid]; start = t["start"] + 0.2; d = t["end"] - start
    nar = narration(sid); q = wav_dur(nar)
    need = q + 0.5 + 0.9
    D = max(d, need)
    extra = D - d
    pad = f",tpad=stop_mode=clone:stop_duration={extra:.3f}" if extra > 0.01 else ""
    inputs = ["-ss", f"{start:.3f}", "-t", f"{d:.3f}", "-i", rec, "-loop", "1", "-t", f"{D:.3f}", "-i", f"{W}/cap_{sid}.png", "-i", nar]
    filt = (f"[0:v]fps={FPS},scale=1920:960,pad=1920:1080:0:0:color=0x121D26{pad},fade=t=in:st=0:d={FADE},fade=t=out:st={D - FADE:.3f}:d={FADE}[b];"
            f"[1:v]fade=t=in:st=0.2:d=0.3:alpha=1,fade=t=out:st={D - 0.5:.3f}:d=0.3:alpha=1[c];[b][c]overlay=0:0[v];"
            f"[2:a]adelay=500|500,apad,atrim=0:{D:.3f},aformat=sample_rates=44100:channel_layouts=stereo[a]")
    seg(sid, inputs, filt, D, nar); total += D
    report.append((sid, d, q, D, D - 0.5 - q))
for r_ in report: print("сцена %s: видео %.1f с, речь %.1f с, итог %.1f с, тишина в хвосте %.1f с" % r_)

'''
s = s[:a] + scene_block + s[b:]

s = s.replace('d12 = wav_dur(f"{W}/s12.wav") + 2.5', 'n12 = narration("s12"); d12 = wav_dur(n12) + 2.5')
s = s.replace('"-i", f"{W}/s12.wav"]', '"-i", n12]')

i = s.index('run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/qjoined.mp4"')
new = '''run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{W}/qjoined.mp4", "-i", f"{W}/qmusic.wav",
     "-filter_complex", "[1:a]volume=0.07[m];[0:a]asplit=2[v][k];[m][k]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=500[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[a]",
     "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", OUT])
print("готово:", os.path.abspath(OUT))
'''
s = s[:i] + new
open(f'{W}/compose2.py', 'w', encoding='utf-8').write(s)
print("compose2.py создан")
