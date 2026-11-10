import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script("Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});window.__glNoFpsGuard=true;"); pg=await ctx.new_page()
        await pg.goto('http://localhost:4322/series/prueba-calle', wait_until='networkidle'); await pg.wait_for_timeout(2500)
        await pg.mouse.move(700,500)
        for _ in range(4):
            await pg.mouse.wheel(0,500); await pg.wait_for_timeout(30)
        for t in [50,300,1500]:
            await pg.screenshot(path=f'/home/claude/shots/web1-fix-bar-{t}.png')
            await pg.wait_for_timeout(t)
            print(t, await pg.evaluate("JSON.stringify([document.querySelector('[data-seriesbar]').getBoundingClientRect().height, getComputedStyle(document.querySelector('[data-seriesbar]')).transform, scrollY])"))
        await pg.screenshot(path='/home/claude/shots/web1-fix-bar.png')
        await b.close()
asyncio.run(main())
