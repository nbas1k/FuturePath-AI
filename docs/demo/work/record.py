"""Запись демонстрации FuturePath AI: настоящие действия в браузере (Playwright + Edge), настоящий ИИ.
Результаты не подменяются: ответы вводятся через интерфейс, итог читается со страницы и проверяется."""
import asyncio, json, os, re, subprocess, sys, time
from playwright.async_api import async_playwright

W = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:3001"
ZOOM = 1.5
scenes = {s["id"]: s for s in json.load(open(f"{W}/scenes.json", encoding="utf-8"))}

def dur(i):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{W}/{i}.wav"], text=True)
    return float(out.strip())

INIT = """
(() => {
  const z = %s;
  const setup = () => {
    document.body.style.zoom = z;
    if (document.getElementById('fp-cursor')) return;
    const c = document.createElement('div'); c.id = 'fp-cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;border-radius:50%%;border:3px solid #FFD84D;background:rgba(20,89,95,.35);z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:width .12s,height .12s,margin .12s,background .12s;box-shadow:0 0 0 2px rgba(0,0,0,.35)';
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', e => { c.style.transform = 'translate(' + (e.clientX - 15) + 'px,' + (e.clientY - 15) + 'px)'; }, true);
    document.addEventListener('mousedown', () => { c.style.background = 'rgba(255,216,77,.8)'; c.style.width = '22px'; c.style.height = '22px'; c.style.margin = '4px'; }, true);
    document.addEventListener('mouseup', () => { c.style.background = 'rgba(20,89,95,.35)'; c.style.width = '30px'; c.style.height = '30px'; c.style.margin = '0'; }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  document.addEventListener('DOMContentLoaded', () => { if (document.body) new MutationObserver(() => { if (document.body.style.zoom != z) document.body.style.zoom = z; }).observe(document.body, { attributes: true, attributeFilter: ['style'] }); });
})();
""" % ZOOM

class Rec:
    def __init__(self, page):
        self.page = page
        self.x, self.y = 960.0, 480.0
        self.base = time.perf_counter()
        self.timeline = []

    def now(self):
        return time.perf_counter() - self.base

    async def glide(self, x, y, t=0.55):
        n = max(8, int(t / 0.016))
        x0, y0 = self.x, self.y
        for i in range(1, n + 1):
            k = i / n
            k = k * k * (3 - 2 * k)  # плавное начало и конец
            await self.page.mouse.move(x0 + (x - x0) * k, y0 + (y - y0) * k)
            await asyncio.sleep(0.016)
        self.x, self.y = x, y

    async def to(self, loc, t=0.6, dy=0):
        # элемент ставим в середину экрана, чтобы закреплённое меню его не перекрывало
        await loc.evaluate("e=>e.scrollIntoView({block:'center'})")
        await asyncio.sleep(0.25)
        bb = await loc.bounding_box()
        await self.glide(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2 + dy, t)
        return bb

    async def hover(self, loc, t=0.9, dy=0):
        """Наведение без прокрутки страницы (для первого экрана)."""
        bb = await loc.bounding_box()
        await self.glide(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2 + dy, t)

    async def click(self, loc, t=0.6):
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

    async def scroll(self, dy, t=1.6):
        n = max(10, int(t / 0.03))
        for i in range(n):
            await self.page.mouse.wheel(0, dy / n)
            await asyncio.sleep(0.03)

    async def zoom(self, sel, s=1.07):
        await self.page.evaluate("([sel,s])=>{const e=document.querySelector(sel); if(!e) return; e.style.transition='transform .9s ease'; e.style.transformOrigin='center top'; e.style.transform='scale('+s+')'; e.style.position='relative'; e.style.zIndex=5}", [sel, s])

    async def scene(self, sid, action):
        t0 = self.now()
        await asyncio.sleep(0.25)
        await action()
        need = dur(sid) + 1.0
        left = need - (self.now() - t0)
        if left > 0:
            await asyncio.sleep(left)
        self.timeline.append({"id": sid, "start": t0, "end": self.now()})
        print(f"{sid}: {t0:.1f}-{self.now():.1f}", flush=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width": 1920, "height": 960}, device_scale_factor=1, locale="ru-RU", record_video_dir=f"{W}/rec", record_video_size={"width": 1920, "height": 960})
        await ctx.add_init_script(INIT)
        page = await ctx.new_page()
        r = Rec(page)
        # чистый тестовый профиль: новый контекст без cookie
        page.on("pageerror", lambda e: print("PAGEERROR", e))

        async def s1():
            await page.goto(BASE + "/"); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.2)
            h = page.locator("h1").first
            await r.hover(h, 1.0, dy=40); await asyncio.sleep(1.5)
            await r.hover(page.get_by_role("link", name="Проверить свои навыки"), 1.2); await asyncio.sleep(1.0)
            await r.hover(page.get_by_role("link", name="Посмотреть все возможности"), 1.0); await asyncio.sleep(1.0)
        async def s2():
            await r.scroll(700, 2.4); await asyncio.sleep(0.8)
            for t in ["Цель", "Диагностика", "Обучение"]:
                await r.to(page.locator("#how-title ~ ol h3", has_text=t).first, 0.6); await asyncio.sleep(0.5)
            await r.scroll(-700, 2.0)
            await asyncio.sleep(0.5)
            await r.zoom("[aria-labelledby=example-title]", 1.06)
            await r.to(page.locator("[aria-labelledby=example-title] figure"), 0.8); await asyncio.sleep(2.0)
        async def s3():
            await r.zoom("[aria-labelledby=example-title]", 1.0)
            await r.click(page.get_by_role("link", name="Проверить свои навыки"))
            await page.wait_for_selector("#goal-select"); await asyncio.sleep(1.2)
            await r.to(page.locator("#goal-select"), 0.7)
            await page.select_option("#goal-select", label="Разработчик программ"); await asyncio.sleep(0.8)
            await r.click(page.get_by_role("button", name="Выбрать эту цель"))
            await page.wait_for_selector("input[name=skill]"); await asyncio.sleep(1.0)
        async def s4():
            await r.click(page.locator("label", has_text="Умение разбивать задачу на шаги").first)
            await r.click(page.get_by_role("button", name="Начать цикл по этому навыку"))
            await page.wait_for_selector("text=Как ИИ меняет профессию"); await asyncio.sleep(1.5)
            await r.scroll(450, 2.0); await asyncio.sleep(1.0)
            await r.to(page.locator("text=Что остаётся важным для человека").first, 0.8)
        async def s5():
            await r.click(page.get_by_role("button", name=re.compile("Понятно")))
            await page.wait_for_selector("text=Диагностика без ИИ"); await asyncio.sleep(1.0)
            fs = page.locator("[role=tabpanel] fieldset")
            for i, k in enumerate([0, 1, 0]):
                await r.click(fs.nth(i).locator("label").nth(k)); await asyncio.sleep(0.4)
            await r.click(page.get_by_role("button", name="Сдать диагностику"))
            await page.wait_for_selector("text=Начальный уровень"); await asyncio.sleep(1.0)
            await r.to(page.locator("text=Начальный уровень").first, 0.7)
        async def s6():
            cards = page.locator(".card:has-text('Пробел:')")
            n = await cards.count()
            for i in range(n):
                c = cards.nth(i)
                await r.to(c.locator("p.font-semibold").first, 0.6); await asyncio.sleep(1.2)
                await r.click(c.locator("label").nth(1))
                await r.click(c.get_by_role("button", name="Проверить ответ")); await asyncio.sleep(1.8)
        hint_ok = {"v": False}
        async def s7():
            await r.scroll(300, 1.0)
            btn = page.get_by_role("button", name="Получить подсказки ИИ")
            await r.click(btn)
            for attempt in range(3):
                try:
                    await page.wait_for_selector("text=Подсказка ИИ", timeout=50000)
                    hint_ok["v"] = True; break
                except Exception:
                    print("AI hints retry", attempt, flush=True)
                    b2 = page.get_by_role("button", name="Получить подсказки ИИ")
                    if await b2.count(): await r.click(b2)
        async def s8():
            fs = page.locator("[role=tabpanel] fieldset")
            n = await fs.count(); chk = 0
            for i in range(n):
                f = fs.nth(i)
                await f.scroll_into_view_if_needed(); await asyncio.sleep(0.5)
                txt = await f.inner_text()
                labels = f.locator("label")
                if "Проверьте утверждение" in txt:
                    k = [1, 0, 1][chk]; chk += 1
                else:
                    m = re.search(r"вариант «([^»]+)»", txt)
                    cnt = await labels.count(); k = 0
                    for j in range(cnt):
                        if (await labels.nth(j).inner_text()).strip() == (m.group(1) if m else ""):
                            k = j
                await r.click(labels.nth(k)); await asyncio.sleep(0.3)
            ta = page.locator("#reflection")
            await r.click(ta)
            await page.keyboard.type("Я проверил каждую подсказку ИИ на простом примере и сомневался в порядке шагов.", delay=42)
            await asyncio.sleep(0.8)
            await r.click(page.get_by_role("button", name="Сдать задания с ИИ"))
            await page.wait_for_selector("text=Повторная проверка без ИИ"); await asyncio.sleep(1.0)
        async def s9():
            fs = page.locator("[role=tabpanel] fieldset")
            for i, k in enumerate([1, 1, 2]):
                await r.click(fs.nth(i).locator("label").nth(k)); await asyncio.sleep(0.4)
            await r.click(page.get_by_role("button", name="Сдать повторную проверку"))
            await page.wait_for_selector("text=Результат вырос"); await asyncio.sleep(1.0)
        async def s10():
            fig = page.locator("[role=tabpanel] figure").first
            await r.to(fig, 0.8, dy=-60)
            await r.zoom("[role=tabpanel] figure", 1.0)
            await page.evaluate("()=>{const f=document.querySelector('[role=tabpanel] figure').parentElement; f.style.transition='transform .9s ease'; f.style.transformOrigin='center top'; f.style.transform='scale(1.08)'; f.style.position='relative'; f.style.zIndex=5}")
            await asyncio.sleep(2.5)
            await r.to(page.locator("text=Какие ошибки исправлены").first, 0.9); await asyncio.sleep(2.0)
            await r.to(page.locator("text=Это 3 задания по навыку").first, 0.9); await asyncio.sleep(1.5)
        async def s11():
            await page.goto(BASE + "/features"); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.2)
            await r.to(page.get_by_role("heading", name="Все возможности"), 0.7); await asyncio.sleep(1.0)
            await r.scroll(900, 3.0); await asyncio.sleep(0.6)
            await r.scroll(1100, 3.2); await asyncio.sleep(0.6)
            await r.scroll(-1800, 2.4)
            s = page.get_by_placeholder("Поиск по возможностям")
            await r.click(s)
            await page.keyboard.type("кабинет", delay=90); await asyncio.sleep(2.2)
            await page.fill("input[type=search]", ""); await asyncio.sleep(0.8)

        for sid, fn in [("s1", s1), ("s2", s2), ("s3", s3), ("s4", s4), ("s5", s5), ("s6", s6), ("s7", s7), ("s8", s8), ("s9", s9), ("s10", s10), ("s11", s11)]:
            await r.scene(sid, fn)

        # проверка реального результата на странице цикла: ничего не подменяем
        await page.goto(BASE + "/learn?tab=cycle"); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.5)
        body = await page.inner_text("body")
        facts = {"growth": (re.search(r"Результат вырос с \d до \d из \d", body) or [None])[0], "fixed": "Исправлено" in body, "hints_real_ai": hint_ok["v"]}
        print("FACTS", facts, flush=True)
        json.dump({"timeline": r.timeline, "facts": facts}, open(f"{W}/timeline.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        await ctx.close(); await b.close()

asyncio.run(main())
