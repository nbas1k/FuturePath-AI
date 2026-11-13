"""Проверка двух сценариев в браузере (Playwright + Edge), настоящий ИИ. Не часть проекта: лежит в игнорируемой папке."""
import asyncio, re, sys, json
from playwright.async_api import async_playwright

BASE = "http://localhost:3001"
OUT = "docs/demo/work/e2e"

async def overflow(page, tag):
    r = await page.evaluate("""()=>{const W=innerWidth;const bad=[];document.querySelectorAll('main *, header *').forEach(e=>{if(e.closest('[role=tablist],ol[aria-label],.overflow-x-auto,svg,.sr-only,table'))return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>W+1||r.left<-1))bad.push(e.tagName+'.'+String(e.className).slice(0,30))});return [W,document.documentElement.scrollWidth,bad.slice(0,3)]}""")
    print(f"  [{tag}] ширина {r[0]}, прокрутка {r[1]}, выходящие: {r[2]}")
    return r

async def run_cycle(page, label):
    """Общий проход цикла AI Readiness через интерфейс; ответы выбираются без подгонки (первый вариант)."""
    await page.wait_for_selector("input[name=skill]")
    chip = await page.locator("text=рекомендуем начать с этого").count()
    print(f"  [{label}] подсказка «рекомендуем начать»: {chip}")
    sel = await page.evaluate("document.querySelector('input[name=skill]:checked')?.parentElement.innerText")
    print(f"  [{label}] предвыбран навык: {sel!r}")
    await page.get_by_role("button", name="Начать цикл по этому навыку").click()
    await page.wait_for_selector("text=Как ИИ меняет профессию")
    await page.get_by_role("button", name=re.compile("Понятно")).click()
    await page.wait_for_selector("text=Этап 2. Диагностика без ИИ")
    fs = page.locator("[role=tabpanel] fieldset")
    for i in range(await fs.count()):
        await fs.nth(i).locator("label").nth(0).click()
    await page.get_by_role("button", name="Сдать диагностику").click()
    await page.wait_for_selector("text=Начальный уровень (диагностика без ИИ)")
    before = re.search(r"Начальный уровень[^:]*: (\d) из 3", await page.inner_text("[role=tabpanel]")).group(1)
    cards = page.locator(".card:has-text('Пробел:')")
    n = await cards.count()
    for i in range(n):
        c = cards.nth(i)
        await c.locator("label").nth(0).click()
        await c.get_by_role("button", name="Проверить ответ").click()
        await asyncio.sleep(1.0)
    await page.wait_for_selector("text=Этап 4. Работа с ИИ")
    await page.get_by_role("button", name="Получить подсказки ИИ").click()
    await page.wait_for_selector("text=Подсказка ИИ", timeout=90000)
    fs = page.locator("[role=tabpanel] fieldset")
    for i in range(await fs.count()):
        await fs.nth(i).locator("label").nth(0).click()
    await page.locator("#reflection").fill("Проверил подсказки ИИ на простых примерах и сомневался в отдельных утверждениях.")
    await page.get_by_role("button", name="Сдать задания с ИИ").click()
    await page.wait_for_selector("text=Этап 5. Повторная проверка")
    fs = page.locator("[role=tabpanel] fieldset")
    for i in range(await fs.count()):
        await fs.nth(i).locator("label").nth(0).click()
    await page.get_by_role("button", name="Сдать повторную проверку").click()
    await page.wait_for_selector("text=Этап 6. Результат")
    txt = await page.inner_text("[role=tabpanel]")
    after = re.search(r"Итоговый результат: (\d) из 3", txt).group(1)
    print(f"  [{label}] упражнений по ошибкам: {n}; было {before} из 3, стало {after} из 3; ruler aria: {await page.locator('[role=tabpanel] figure').first.get_attribute('aria-label')}")
    return int(before), int(after)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        # ---------- СЦЕНАРИЙ 1: тест -> рекомендации -> выбор -> AI Readiness
        print("СЦЕНАРИЙ 1: тест → топ-5 → выбор → AI Readiness")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900}, locale="ru-RU")
        page = await ctx.new_page()
        await page.goto(BASE + "/"); await page.wait_for_load_state("networkidle")
        print("  главная: два сценария:", await page.locator("[role=group] h2").all_inner_texts())
        await page.get_by_role("link", name="Пройти профориентацию").click()
        await page.wait_for_url("**/test")
        for q in range(24):
            await page.locator("[aria-pressed]").first.click()
            btn = page.get_by_role("button", name=re.compile("Дальше|Показать результат"))
            await btn.click()
            if q < 23: await asyncio.sleep(0.15)
        await page.wait_for_url("**/result", timeout=30000)
        await page.wait_for_selector("#top5-title")
        items = page.locator("section[aria-labelledby=top5-title] > ol > li")
        n = await items.count()
        print("  топ-5: карточек", n)
        for i in range(n):
            t = await items.nth(i).locator("h3").inner_text()
            has = {k: await items.nth(i).locator(f"h4:has-text('{k}')").count() for k in ["Почему подходит", "Какие навыки", "Какие задачи может изменить ИИ", "Какие человеческие навыки"]}
            lim = await items.nth(i).locator("text=Ограничения рекомендации").count()
            print(f"   {i+1}. {t}: разделы {list(has.values())}, ограничения {lim}")
        print("  таблица сравнения строк:", await page.locator("table tbody tr").count())
        await page.screenshot(path=f"{OUT}_s1_result.png", full_page=False)
        # выбираем первую профессию, у которой есть полный цикл
        target = None
        for i in range(n):
            if await items.nth(i).locator("text=есть полный цикл AI Readiness").count():
                target = i; break
        if target is None:
            print("  в топ-5 нет профессии с циклом: выбираем первую и проверяем честное сообщение")
            target = 0
        title = await items.nth(target).locator("h3").inner_text()
        await items.nth(target).get_by_role("button", name=re.compile("Выбрать эту профессию")).click()
        await page.wait_for_url("**/learn?tab=cycle", timeout=30000)
        print("  выбрана:", title, "→", page.url)
        if await page.locator("input[name=skill]").count():
            b1, a1 = await run_cycle(page, "сц.1")
        else:
            print("  цикла для профессии нет:", (await page.inner_text("main"))[:160].replace("\n", " "))
        # сохранение между посещениями
        await page.goto(BASE + "/profile"); await page.wait_for_load_state("networkidle")
        cm = await page.inner_text("#career-title ~ div, section[aria-labelledby=career-title]")
        print("  карьерная карта после перезагрузки (фрагмент):", re.sub(r"\s+", " ", cm)[:420])
        await page.screenshot(path=f"{OUT}_s1_career.png")
        await ctx.close()

        # ---------- СЦЕНАРИЙ 2: прямой выбор -> AI Readiness (мобильная ширина 375)
        print("СЦЕНАРИЙ 2: прямой выбор профессии → AI Readiness (375 px)")
        ctx = await b.new_context(viewport={"width": 375, "height": 812}, locale="ru-RU")
        page = await ctx.new_page()
        await page.goto(BASE + "/"); await page.wait_for_load_state("networkidle")
        await overflow(page, "главная")
        await page.get_by_role("link", name="Проверить свои навыки").first.click()
        await page.wait_for_selector("#goal-select")
        await page.select_option("#goal-select", label="UX/UI-дизайнер")
        await page.get_by_role("button", name="Выбрать эту цель").click()
        await page.wait_for_selector("input[name=skill]")
        await overflow(page, "выбор навыка")
        b2, a2 = await run_cycle(page, "сц.2")
        await overflow(page, "итог цикла")
        await page.goto(BASE + "/profile"); await page.wait_for_load_state("networkidle")
        await overflow(page, "карьерная карта")
        cm = await page.inner_text("section[aria-labelledby=career-title]")
        print("  карта: тест не проходился ->", "тест не проходился" in cm, "| есть диагностика ->", "«" in cm and "из 3" in cm or "Завершённых" not in cm)
        await page.screenshot(path=f"{OUT}_s2_career_mobile.png")
        await page.goto(BASE + "/result"); await page.wait_for_load_state("networkidle")
        await overflow(page, "result без теста")
        await ctx.close()

        # ---------- мобильная ширина страницы результата (после теста)
        print("МОБИЛЬНАЯ ВЕРСИЯ страницы результата")
        ctx = await b.new_context(viewport={"width": 375, "height": 812}, locale="ru-RU")
        page = await ctx.new_page()
        await page.goto(BASE + "/test"); await page.wait_for_load_state("networkidle")
        for q in range(24):
            await page.locator("[aria-pressed]").first.click()
            await page.get_by_role("button", name=re.compile("Дальше|Показать результат")).click()
            await asyncio.sleep(0.1)
        await page.wait_for_url("**/result", timeout=30000); await page.wait_for_selector("#top5-title")
        await overflow(page, "топ-5")
        await page.screenshot(path=f"{OUT}_s1_result_mobile.png")
        await b.close()

asyncio.run(main())
