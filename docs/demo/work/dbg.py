import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="msedge", headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":900})
        page = await ctx.new_page()
        await page.goto("http://localhost:3001/")
        async def post(u, body):
            return await page.evaluate("async ([u,b])=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return [r.status,(await r.json()).error||'ok']}", [u, body])
        P = "software-developer"
        print(await post("/api/journey/select", {"professionId":P}))
        print(await post("/api/cycle", {"professionId":P,"action":"start","skill":"Умение разбивать задачу на шаги"}))
        print(await post("/api/cycle", {"professionId":P,"action":"future"}))
        print(await post("/api/cycle", {"professionId":P,"action":"diag","answers":{"ds1-d":0,"ds2-d":1,"ds3-d":0}}))
        print(await post("/api/cycle", {"professionId":P,"action":"practice","taskId":"ds1-e","answer":1}))
        print(await post("/api/cycle", {"professionId":P,"action":"practice","taskId":"ds3-e","answer":1}))
        print(await post("/api/cycle", {"professionId":P,"action":"ai-help"}))
        await b.close()
asyncio.run(main())
