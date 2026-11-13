import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        for name, w, h in [("home_d", 1280, 900), ("home_m", 375, 812)]:
            ctx = await b.new_context(viewport={"width": w, "height": h}, locale="ru-RU")
            page = await ctx.new_page()
            await page.goto("http://localhost:3001/"); await page.wait_for_load_state("networkidle"); await asyncio.sleep(1.3)
            await page.screenshot(path=f"e2e_{name}.png", full_page=(name=="home_m"))
            await ctx.close()
        await b.close()
asyncio.run(main())
