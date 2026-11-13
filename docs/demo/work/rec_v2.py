"""Запись всех сцен V2 на чистом профиле (127.0.0.8). Отметки времени пишутся по границам сцен."""
import asyncio, json, re, time
from playwright.async_api import async_playwright

BASE_C = "http://127.0.0.8:3001"


def ts():
    return time.perf_counter()


async def glide(page, st, x, y, t=0.5):
    n = max(8, int(t / 0.016))
    x0, y0 = st["x"], st["y"]
    for i in range(1, n + 1):
        k = i / n
        k = k * k * (3 - 2 * k)
        await page.mouse.move(x0 + (x - x0) * k, y0 + (y - y0) * k)
        await asyncio.sleep(0.016)
    st["x"], st["y"] = x, y


async def hover(page, st, loc, t=0.8):
    await loc.evaluate("e=>e.scrollIntoView({block:'center'})")
    await asyncio.sleep(0.2)
    bb = await loc.bounding_box()
    await glide(page, st, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, t)


async def click(page, st, loc, t=0.5):
    await hover(page, st, loc, t)
    await asyncio.sleep(0.12)
    await page.mouse.down()
    await asyncio.sleep(0.08)
    await page.mouse.up()
    await asyncio.sleep(0.25)


async def main():
    M = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width": 1920, "height": 960}, locale="ru-RU",
                                  record_video_dir="rec_v2", record_video_size={"width": 1920, "height": 960})
        page = await ctx.new_page()
        st = {"x": 960.0, "y": 480.0}
        await page.goto(BASE_C + "/")
        await page.wait_for_load_state("networkidle")
        M["s1_start"] = ts()
        await asyncio.sleep(3.0)
        await hover(page, st, page.locator("h1").first, 1.0)
        await asyncio.sleep(4.0)
        M["s2_start"] = ts()
        await hover(page, st, page.get_by_role("heading", name="Уже знаю свою профессию"), 0.8)
        await asyncio.sleep(2.0)
        await hover(page, st, page.get_by_role("heading", name="Не знаю, какую профессию выбрать"), 0.8)
        await asyncio.sleep(3.0)
        M["s3_start"] = ts()
        await click(page, st, page.get_by_role("link", name="Пройти профориентацию"))
        await page.wait_for_url("**/test")
        await asyncio.sleep(2.0)
        for q in range(24):
            await click(page, st, page.locator("[aria-pressed]").nth(1 if q % 3 == 0 else 0), 0.35)
            await asyncio.sleep(0.2)
            await click(page, st, page.get_by_role("button", name=re.compile("Дальше|Показать результат")), 0.3)
        await page.wait_for_url("**/result", timeout=40000)
        await page.wait_for_selector("#top5-title")
        M["s4_start"] = ts()
        await asyncio.sleep(0.5)
        await hover(page, st, page.locator("#top5-title"), 0.8)
        await asyncio.sleep(3.5)
        await page.evaluate("()=>window.scrollBy(0,650)")
        await asyncio.sleep(3.0)
        await page.evaluate("()=>window.scrollBy(0,650)")
        await asyncio.sleep(2.5)
        M["s5_start"] = ts()
        await hover(page, st, page.locator("table").first, 0.8)
        await asyncio.sleep(3.5)
        await page.evaluate("()=>window.scrollTo(0,0)")
        await asyncio.sleep(0.5)
        card = page.locator("section[aria-labelledby=top5-title] > ol > li").filter(has_text="Разработчик программ").first
        bt = card.get_by_role("button", name=re.compile("Выбрать эту профессию"))
        await hover(page, st, bt, 0.9)
        await asyncio.sleep(1.2)
        await click(page, st, bt, 0.5)
        M["s6_start"] = ts()
        await page.wait_for_url("**/learn?tab=cycle", timeout=30000)
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1.0)
        if not await page.locator("input[name=skill]").count():
            await page.evaluate("()=>fetch('/api/journey/select',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({professionId:'software-developer'})})")
            await asyncio.sleep(0.8)
            await page.goto(BASE_C + "/learn?tab=cycle")
            await page.wait_for_load_state("networkidle")
        if not await page.locator("input[name=skill]").count():
            await page.wait_for_load_state("networkidle"); await asyncio.sleep(2.0)
            print("CYCLE TEXT:", (await page.inner_text("main"))[:300].replace(chr(10)," | "), flush=True)
        await page.wait_for_selector("input[name=skill]", timeout=40000)
        await asyncio.sleep(2.5)
        await hover(page, st, page.get_by_role("button", name="Начать цикл по этому навыку"), 0.8)
        await page.get_by_role("button", name="Начать цикл по этому навыку").click()
        await page.wait_for_selector("text=Как ИИ меняет профессию", timeout=60000)
        await asyncio.sleep(2.0)
        await hover(page, st, page.get_by_role("button", name=re.compile("Понятно")), 0.6)
        await page.get_by_role("button", name=re.compile("Понятно")).click()
        M["s7_start"] = ts()
        await page.wait_for_selector("text=Этап 2. Диагностика без ИИ")
        await asyncio.sleep(1.0)
        fs = page.locator("[role=tabpanel] fieldset")
        for i in range(await fs.count()):
            await click(page, st, fs.nth(i).locator("label").nth(0), 0.35)
            await asyncio.sleep(0.4)
        await click(page, st, page.get_by_role("button", name="Сдать диагностику"))
        await page.wait_for_selector("text=Начальный уровень (диагностика без ИИ)")
        await asyncio.sleep(2.0)
        cards = page.locator(".card:has-text('Пробел:')")
        n = await cards.count()
        M["s8_start"] = ts()
        for i in range(n):
            c = cards.nth(i)
            await hover(page, st, c.locator("p.font-semibold").first, 0.6)
            await asyncio.sleep(1.2)
            await click(page, st, c.locator("label").nth(1), 0.4)
            await click(page, st, c.get_by_role("button", name="Проверить ответ"), 0.4)
            await asyncio.sleep(1.6)
        # наставник
        await page.goto(BASE_C + "/learn?tab=mentor")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("#mentor-input")
        await asyncio.sleep(1.2)
        await click(page, st, page.locator("#mentor-input"), 0.5)
        await page.keyboard.type("Как лучше тренировать поиск ошибок в коде?", delay=45)
        await asyncio.sleep(0.8)
        await click(page, st, page.get_by_role("button", name="Отправить"))
        try:
            await page.wait_for_selector("text=Наставник (ИИ)", timeout=150000)
        except Exception:
            print("MENTOR ALERT:", await page.locator("[role=alert]").all_inner_texts(), flush=True)
            print("MENTOR TEXT:", (await page.inner_text("main"))[-400:].replace(chr(10)," | "), flush=True)
            raise
        await asyncio.sleep(3.0)
        M["s9_start"] = ts()
        await page.goto(BASE_C + "/learn?tab=cycle")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("text=Этап 4. Работа с ИИ", timeout=40000)
        await asyncio.sleep(1.5)
        await hover(page, st, page.get_by_role("button", name="Получить подсказки ИИ"), 0.6)
        await page.get_by_role("button", name="Получить подсказки ИИ").click()
        try:
            await page.wait_for_selector("text=Подсказка ИИ", timeout=150000)
        except Exception:
            print("ALERT:", await page.locator("[role=alert]").all_inner_texts(), flush=True)
            raise
        await asyncio.sleep(2.0)
        fs = page.locator("[role=tabpanel] fieldset")
        for i in range(await fs.count()):
            f = fs.nth(i)
            await f.scroll_into_view_if_needed()
            await asyncio.sleep(0.4)
            await click(page, st, f.locator("label").nth(0), 0.35)
            await asyncio.sleep(0.3)
        await hover(page, st, page.locator("#reflection"), 0.7)
        await click(page, st, page.locator("#reflection"), 0.4)
        await page.keyboard.type("Проверил подсказки ИИ на простых примерах и сомневался в отдельных утверждениях.", delay=30)
        await asyncio.sleep(0.8)
        await click(page, st, page.get_by_role("button", name="Сдать задания с ИИ"))
        await page.wait_for_selector("text=Этап 5. Повторная проверка")
        await asyncio.sleep(1.0)
        M["s10_start"] = ts()
        fs = page.locator("[role=tabpanel] fieldset")
        for i in range(await fs.count()):
            await fs.nth(i).locator("label").nth(0).scroll_into_view_if_needed()
            await fs.nth(i).locator("input[type=radio]").nth(0).check(force=True)
            await asyncio.sleep(0.6)
        btn = page.get_by_role("button", name="Сдать повторную проверку")
        print("retest disabled:", await btn.is_disabled(), "fieldsets:", await fs.count(), flush=True)
        await btn.click(force=True)
        await page.wait_for_selector("text=Этап 6. Результат", timeout=60000)
        await asyncio.sleep(3.0)
        await hover(page, st, page.locator("[role=tabpanel] figure").first, 0.8)
        await asyncio.sleep(3.0)
        M["s11_start"] = ts()
        await page.goto(BASE_C + "/profile")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1.0)
        card = page.locator("section[aria-labelledby=career-title]")
        await hover(page, st, card, 0.9)
        await asyncio.sleep(3.0)
        await page.evaluate("()=>document.querySelector('section[aria-labelledby=career-title]').scrollIntoView({block:'start'})")
        await asyncio.sleep(3.0)
        await page.evaluate("()=>window.scrollBy(0,500)")
        await asyncio.sleep(3.0)
        M["end"] = ts()
        await ctx.close()
        await b.close()
    json.dump(M, open("rec_v2_marks.json", "w"))
    print("ok", {k: round(v - M["s1_start"], 1) for k, v in M.items()})


asyncio.run(main())
