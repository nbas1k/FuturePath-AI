"""Запись новых сцен: главная с двумя путями, Career Test, топ-5, сравнение, выбор, карьерная карта. Чистый профиль (новый контекст)."""
import asyncio, json, re
from playwright.async_api import async_playwright
BASE = "http://localhost:3001"
async def glide(page, st, x, y, t=0.5):
    n = max(8, int(t / 0.016)); x0, y0 = st["x"], st["y"]
    for i in range(1, n + 1):
        k = i / n; k = k * k * (3 - 2 * k)
        await page.mouse.move(x0 + (x - x0) * k, y0 + (y - y0) * k); await asyncio.sleep(0.016)
    st["x"], st["y"] = x, y
async def hover(page, st, loc, t=0.8):
    await loc.evaluate("e=>e.scrollIntoView({block:'center'})"); await asyncio.sleep(0.2)
    bb = await loc.bounding_box(); await glide(page, st, bb["x"] + bb["width"]/2, bb["y"] + bb["height"]/2, t)
async def click(page, st, loc):
    await hover(page, st, loc, 0.6); await asyncio.sleep(0.15)
    await page.mouse.down(); await asyncio.sleep(0.08); await page.mouse.up(); await asyncio.sleep(0.3)
async def main():
    marks = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width":1920,"height":960}, locale="ru-RU", record_video_dir="rec_new", record_video_size={"width":1920,"height":960})
        page = await ctx.new_page(); st = {"x": 960.0, "y": 480.0}
        T = lambda k: marks.__setitem__(k, __import__('time').perf_counter())
        await page.goto(BASE + "/"); await page.wait_for_load_state("networkidle"); T("home")
        await asyncio.sleep(2.5)
        await hover(page, st, page.get_by_role("heading", name="Не знаю, какую профессию выбрать"), 1.0); await asyncio.sleep(2.0)
        await hover(page, st, page.get_by_role("heading", name="Уже знаю свою профессию"), 1.0); await asyncio.sleep(2.0)
        T("test")
        await click(page, st, page.get_by_role("link", name="Пройти профориентацию")); await page.wait_for_url("**/test")
        for q in range(24):
            opts = page.locator("[aria-pressed]")
            await click(page, st, opts.nth(1 if q % 3 == 0 else 0)); await asyncio.sleep(0.25)
            await click(page, st, page.get_by_role("button", name=re.compile("Дальше|Показать результат")))
        await page.wait_for_url("**/result", timeout=40000); await page.wait_for_selector("#top5-title")
        T("top5")
        sec = page.locator("#top5-title")
        await hover(page, st, sec, 0.8); await asyncio.sleep(1.5)
        await page.evaluate("()=>window.scrollBy(0,700)"); await asyncio.sleep(2.0)
        await page.evaluate("()=>window.scrollBy(0,700)"); await asyncio.sleep(2.0)
        T("compare")
        tbl = page.locator("table").first
        await hover(page, st, tbl, 0.8); await asyncio.sleep(3.5)
        T("choose")
        await page.evaluate("()=>window.scrollTo(0,0)"); await asyncio.sleep(0.8)
        first = page.locator("section[aria-labelledby=top5-title] > ol > li").first
        await hover(page, st, first.get_by_role("button", name=re.compile("Выбрать эту профессию")), 0.8)
        await click(page, st, first.get_by_role("button", name=re.compile("Выбрать эту профессию")))
        await page.wait_for_url("**/learn?tab=cycle", timeout=30000); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.0)
        if not await page.locator("input[name=skill]").count():
            await page.reload(); await page.wait_for_load_state("networkidle")
        if not await page.locator("input[name=skill]").count():
            await page.evaluate("()=>fetch('/api/journey/select',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({professionId:'software-developer'})})"); await asyncio.sleep(1.0)
            await page.goto(BASE + "/learn?tab=cycle"); await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("input[name=skill]", timeout=30000); await asyncio.sleep(2.2)
        T("cycle")
        await page.goto(BASE + "/profile"); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.0); T("career")
        card = page.locator("section[aria-labelledby=career-title]")
        await hover(page, st, card, 0.9); await asyncio.sleep(3.0)
        await page.evaluate("()=>document.querySelector('section[aria-labelledby=career-title]').scrollIntoView({block:'start'})"); await asyncio.sleep(3.0)
        await page.evaluate("()=>window.scrollBy(0,600)"); await asyncio.sleep(3.0)
        T("end")
        await ctx.close(); await b.close()
    json.dump(marks, open("newrec_marks.json","w"))
    print("ok", {k: round(v - marks["home"],1) for k, v in marks.items()})
asyncio.run(main())
