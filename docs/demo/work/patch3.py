p = 'docs/demo/work/record.py'
s = open(p, encoding='utf-8').read()
s = s.replace("    async def click(self, loc, t=0.6):", '''    async def hover(self, loc, t=0.9, dy=0):
        """Наведение без прокрутки страницы (для первого экрана)."""
        bb = await loc.bounding_box()
        await self.glide(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2 + dy, t)

    async def click(self, loc, t=0.6):''', 1)
s = s.replace('await r.to(h, 1.0, dy=40); await asyncio.sleep(1.5)', 'await r.hover(h, 1.0, dy=40); await asyncio.sleep(1.5)')
s = s.replace('await r.to(page.get_by_role("link", name="Посмотреть все возможности"), 1.2); await asyncio.sleep(1.0)', 'await r.hover(page.get_by_role("link", name="Проверить свои навыки"), 1.2); await asyncio.sleep(1.0)\n            await r.hover(page.get_by_role("link", name="Посмотреть все возможности"), 1.0); await asyncio.sleep(1.0)')
open(p, 'w', encoding='utf-8').write(s)
p = 'docs/demo/work/compose.py'
s = open(p, encoding='utf-8').read()
s = s.replace('"-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",', '"-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",')
open(p, 'w', encoding='utf-8').write(s)
print("ok")
