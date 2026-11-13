import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="msedge",headless=True); ctx=await b.new_context(viewport={"width":1280,"height":900},locale="ru-RU"); page=await ctx.new_page()
        await page.goto("http://localhost:3001/test"); await page.wait_for_load_state("networkidle")
        for q in range(24):
            await page.locator("[aria-pressed]").first.click()
            await page.get_by_role("button", name=__import__('re').compile("Дальше|Показать результат")).click()
        await page.wait_for_url("**/result",timeout=40000)
        print("url", page.url, "top5", await page.locator("#top5-title").count())
        await page.goto("http://localhost:3001/learn?tab=cycle"); await page.wait_for_load_state("networkidle")
        print("learn:", (await page.inner_text("main"))[:200].replace("\n"," | "))
        await b.close()
asyncio.run(main())
