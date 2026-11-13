import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":900})
        page = await ctx.new_page()
        await page.goto("http://localhost:3001/learn?tab=cycle"); await page.wait_for_load_state("networkidle")
        await page.select_option("#goal-select", label="Разработчик программ")
        await page.get_by_role("button", name="Выбрать эту цель").click()
        await page.wait_for_selector("input[name=skill]")
        await page.get_by_role("button", name="Начать цикл по этому навыку").click()
        await page.wait_for_selector("text=Как ИИ меняет профессию")
        await page.get_by_role("button", name="Понятно, перейти").click()
        await page.wait_for_selector("text=Диагностика без ИИ")
        fs = page.locator("[role=tabpanel] fieldset")
        print("fieldsets", await fs.count())
        for i in range(await fs.count()):
            await fs.nth(i).locator("label").nth(0).click()
            print(i, "checked total:", await page.locator("[role=tabpanel] input[type=radio]:checked").count())
        print("disabled:", await page.get_by_role("button", name="Сдать диагностику").is_disabled())
        await page.wait_for_timeout(500)
        print("disabled after wait:", await page.get_by_role("button", name="Сдать диагностику").is_disabled())
        await b.close()
asyncio.run(main())
