p = 'docs/demo/work/record.py'
s = open(p, encoding='utf-8').read()

s = s.replace("new MutationObserver(() => { if (document.body && document.body.style.zoom != z) document.body.style.zoom = z; }).observe(document.documentElement, { childList: true, subtree: false });",
              "document.addEventListener('DOMContentLoaded', () => { if (document.body) new MutationObserver(() => { if (document.body.style.zoom != z) document.body.style.zoom = z; }).observe(document.body, { attributes: true, attributeFilter: ['style'] }); });")

old = s[s.index("    async def to(self, loc, t=0.6, dy=0):"):s.index("    async def click(self, loc, t=0.6):")]
new = '''    async def to(self, loc, t=0.6, dy=0):
        # элемент ставим в середину экрана, чтобы закреплённое меню его не перекрывало
        await loc.evaluate("e=>e.scrollIntoView({block:'center'})")
        await asyncio.sleep(0.25)
        bb = await loc.bounding_box()
        await self.glide(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2 + dy, t)
        return bb

'''
s = s.replace(old, new)

old = s[s.index("    async def click(self, loc, t=0.6):"):s.index("    async def scroll(self, dy, t=1.6):")]
new = '''    async def click(self, loc, t=0.6):
        bb = await self.to(loc, t)
        await asyncio.sleep(0.2)
        # убеждаемся, что под курсором нужный элемент; иначе кликаем штатно
        ok = await loc.evaluate("(el,[x,y])=>{const t=document.elementFromPoint(x,y);return !!t&&(el.contains(t)||t.contains(el))}", [self.x, self.y])
        if ok:
            await self.page.mouse.down(); await asyncio.sleep(0.09); await self.page.mouse.up()
        else:
            print("fallback click", flush=True)
            await loc.click()
        await asyncio.sleep(0.35)

'''
s = s.replace(old, new)
s = s.replace('await page.wait_for_selector("text=Подсказка ИИ", timeout=70000)', 'await page.wait_for_selector("text=Подсказка ИИ", timeout=50000)')
open(p, 'w', encoding='utf-8').write(s)
print("ok")
