import os
W = os.path.dirname(os.path.abspath(__file__))
s = open(f'{W}/compose2.py', encoding='utf-8').read()

a = s.index("def narration(sid):")
b = s.index("def wrap(draw, text, font, maxw):")
new_nar = '''def narration(sid, total=None):
    """Фрагменты Qwen TTS одной сцены -> один файл. Края обрезаны, паузы между фрагментами короткие.
    Если задана длительность сцены total, паузы равномерно растягиваются (не более 7 с), чтобы речь шла по всей сцене."""
    import numpy as np, soundfile as sf
    parts = sorted(glob.glob(f"{Q}/{sid}_*.wav"), key=lambda p: int(p.rsplit("_", 1)[1].split(".")[0]))
    assert parts, f"нет озвучки для {sid}"
    arrs = []
    for i, p in enumerate(parts):
        tmp = f"{W}/qtmp_{sid}_{i}.wav"
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,aresample=48000,aformat=channel_layouts=mono", tmp])
        x, sr = sf.read(tmp); arrs.append(x)
        os.remove(tmp)
    n = len(arrs); speech = sum(len(x) for x in arrs) / 48000
    gap = 0.28
    if total is not None and n > 1:
        gap = min(7.0, max(0.28, (total - 1.4 - speech) / (n - 1)))
    sil = np.zeros(int(gap * 48000))
    seq = []
    for i, x in enumerate(arrs):
        seq.append(x)
        if i < n - 1: seq.append(sil)
    raw = f"{W}/qraw_{sid}.wav"
    sf.write(raw, np.concatenate(seq), 48000)
    out = f"{W}/q_{sid}.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-17:TP=-2:LRA=7,aformat=sample_rates=44100:channel_layouts=stereo", out])
    os.remove(raw)
    return out

'''
s = s[:a] + new_nar + s[b:]

# сцена: сначала минимальная длина речи, затем растяжка пауз под длительность сцены
s = s.replace('''    nar = narration(sid); q = wav_dur(nar)
    need = q + 0.5 + 0.9
    D = max(d, need)
    extra = D - d''', '''    q0 = wav_dur(narration(sid))
    D = max(d, q0 + 0.5 + 0.9)
    nar = narration(sid, total=D); q = wav_dur(nar)
    extra = D - d''')
s = s.replace('''for r_ in report: print("сцена %s: видео %.1f с, речь %.1f с, итог %.1f с, тишина в хвосте %.1f с" % r_)''', '''for r_ in report: print("сцена %s: видео %.1f с, речь %.1f с, итог %.1f с" % r_[:4])''')
open(f'{W}/compose2.py', 'w', encoding='utf-8').write(s)
print("ok")
