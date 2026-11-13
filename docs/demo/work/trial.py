import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width":1920,"height":1080}, device_scale_factor=1, record_video_dir="docs/demo/work/trial", record_video_size={"width":1920,"height":1080}, locale="ru-RU")
        await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.zoom='1.4'})")
        page = await ctx.new_page()
        await page.goto("http://localhost:3001/")
        await asyncio.sleep(3)
        bb = await page.locator("text=Проверить свои навыки").first.bounding_box()
        print("bbox", bb, await page.evaluate("[innerWidth, innerHeight, document.documentElement.scrollWidth]"))
        await page.mouse.move(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2, steps=10)
        await asyncio.sleep(1)
        await ctx.close(); await b.close()
asyncio.run(main())
