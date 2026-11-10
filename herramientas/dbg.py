import asyncio
from playwright.async_api import async_playwright
ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__glNoFpsGuard=true;"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script(INIT); pg=await ctx.new_page()
        await pg.goto('http://localhost:4322/series/prueba-calle', wait_until='networkidle'); await pg.wait_for_timeout(3500)
        print('t0', await pg.evaluate("[...document.querySelectorAll('.gl-on')].map(e=>e.closest('li').id)"))
        await pg.mouse.move(700,500)
        for _ in range(4):
            await pg.mouse.wheel(0,500); await pg.wait_for_timeout(30)
        for t in [300,1000,2000,4000]:
            await pg.wait_for_timeout(t)
            print(t, await pg.evaluate("[...document.querySelectorAll('.gl-on')].map(e=>e.closest('li').id)"))
        await b.close()
asyncio.run(main())
