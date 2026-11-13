import re
p = 'docs/demo/work/record.py'
s = open(p, encoding='utf-8').read()
s = s.replace('ZOOM = 1.4', 'ZOOM = 1.5')
s = s.replace('viewport={"width": 1920, "height": 1080}', 'viewport={"width": 1920, "height": 960}')
s = s.replace('record_video_size={"width": 1920, "height": 1080}', 'record_video_size={"width": 1920, "height": 960}')
s = s.replace('self.x, self.y = 960.0, 540.0', 'self.x, self.y = 960.0, 480.0')
open(p, 'w', encoding='utf-8').write(s)

p = 'docs/demo/work/compose.py'
s = open(p, encoding='utf-8').read()
a = s.index('def caption_png(text, path):')
b = s.index('def card_png(')
new = '''def caption_png(text, path):
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

'''
s = s[:a] + new + s[b:]
s = s.replace('[0:v]fps={FPS},scale=1920:1080,fade=t=in:st=0:d={FADE},fade=t=out:st={d - FADE:.3f}:d={FADE}[b];', '[0:v]fps={FPS},scale=1920:960,pad=1920:1080:0:0:color=0x121D26,fade=t=in:st=0:d={FADE},fade=t=out:st={d - FADE:.3f}:d={FADE}[b];')
s = s.replace('[1:v]fade=t=in:st=0.5:d=0.4:alpha=1,fade=t=out:st={d - 0.8:.3f}:d=0.4:alpha=1[c];', '[1:v]fade=t=in:st=0.2:d=0.3:alpha=1,fade=t=out:st={d - 0.5:.3f}:d=0.3:alpha=1[c];')
s = s.replace('"-crf", "17"', '"-crf", "19"')
s = s.replace('amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]', 'amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]')
open(p, 'w', encoding='utf-8').write(s)
print("ok")
