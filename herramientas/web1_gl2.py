import asyncio
from playwright.async_api import async_playwright
B='http://localhost:4322'
ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__glNoFpsGuard=true;"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        ctx = await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script(INIT)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(3500)
        await pg.evaluate("window.scrollTo(0, document.querySelectorAll('.roll')[2].offsetTop - 80)")
        for t in range(6):
            await pg.screenshot(path=f'/home/claude/shots/web1-gl-home-dev-{t}.png', clip={'x':56,'y':120,'width':900,'height':300})
            await pg.wait_for_timeout(120)
        await pg.goto(B+'/series/prueba-concierto', wait_until='networkidle'); await pg.wait_for_timeout(3500)
        await pg.mouse.move(700,500)
        await pg.evaluate("window.scrollTo(0, document.querySelector('#f-02').offsetTop - 60)")
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='/home/claude/shots/web1-gl-serie-rest.png')
        for _ in range(5):
            await pg.mouse.wheel(0, 600); await pg.wait_for_timeout(20)
        await pg.screenshot(path='/home/claude/shots/web1-gl-serie-fast.png')
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path='/home/claude/shots/web1-gl-serie-after.png')
        print('bg', await pg.evaluate("getComputedStyle(document.body).backgroundColor"), 'gl', await pg.evaluate("document.documentElement.className"), errs)
        await b.close()
asyncio.run(main())
