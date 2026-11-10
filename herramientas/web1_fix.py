import asyncio
from playwright.async_api import async_playwright
B='http://localhost:4322'
ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__glNoFpsGuard=true;"
S='/home/claude/shots/web1-fix-'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        errs=[]
        def hook(pg):
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        # 1. overflow
        for w in [320,390,412,1023]:
            ctx=await b.new_context(viewport={'width':w,'height':800}, is_mobile=w<1000, has_touch=w<1000); pg=await ctx.new_page(); hook(pg)
            for path in ['/series/prueba-calle','/','/editores','/sobre']:
                await pg.goto(B+path, wait_until='networkidle'); await pg.wait_for_timeout(300)
                sw=await pg.evaluate('document.documentElement.scrollWidth'); iw=await pg.evaluate('innerWidth')
                if sw!=iw: print('OVERFLOW', w, path, sw, iw)
            await ctx.close()
        print('overflow check done')
        # 2. desktop shots with GL
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script(INIT); pg=await ctx.new_page(); hook(pg)
        await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(3500)
        await pg.screenshot(path=S+'home-desk.png')
        await pg.keyboard.press('Tab'); 
        await pg.locator('[data-frame]').first.focus(); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=S+'home-focus.png')
        box=await pg.locator('.frame__window').nth(2).bounding_box()
        await pg.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2); await pg.wait_for_timeout(500)
        await pg.screenshot(path=S+'home-loupe.png', clip={'x':0,'y':200,'width':1440,'height':500})
        print('gl home', await pg.evaluate("document.documentElement.className"))
        await pg.locator('.frame--selected a').first.click()
        await pg.wait_for_timeout(250); await pg.screenshot(path=S+'vt-mid.png')
        await pg.wait_for_timeout(900); await pg.screenshot(path=S+'vt-end.png')
        print('after vt focus:', await pg.evaluate("document.activeElement.tagName+' '+(document.activeElement.closest('li')||{}).id"), pg.url)
        await pg.mouse.move(700,500)
        for _ in range(4):
            await pg.mouse.wheel(0,500); await pg.wait_for_timeout(30)
        await pg.screenshot(path=S+'serie-fast.png')
        await pg.wait_for_timeout(1800); await pg.screenshot(path=S+'serie-rest.png')
        print('serie gl-on at rest:', await pg.evaluate("document.querySelectorAll('.gl-on').length"), 'bar on:', await pg.evaluate("document.querySelector('[data-seriesbar]').classList.contains('is-on')"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500)
        print('after esc:', pg.url, await pg.evaluate("document.activeElement.id"))
        await pg.screenshot(path=S+'home-after-esc.png')
        await ctx.close()
        # 3. mobile
        ctx=await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg=await ctx.new_page(); hook(pg)
        await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(1500); await pg.screenshot(path=S+'home-mob.png')
        await pg.goto(B+'/series/prueba-calle', wait_until='networkidle'); await pg.wait_for_timeout(1500); await pg.screenshot(path=S+'serie-mob.png')
        await pg.evaluate("document.querySelector('.film').scrollBy(400,0); window.scrollBy(0,300)"); await pg.wait_for_timeout(800); await pg.screenshot(path=S+'serie-mob-2.png')
        await pg.goto(B+'/editores', wait_until='networkidle'); await pg.screenshot(path=S+'editores-mob.png')
        await ctx.close()
        ctx=await b.new_context(viewport={'width':1440,'height':900}); pg=await ctx.new_page(); hook(pg)
        await pg.goto(B+'/editores', wait_until='networkidle'); await pg.screenshot(path=S+'editores-desk.png')
        await pg.goto(B+'/series/prueba-concierto', wait_until='networkidle'); await pg.wait_for_timeout(1500); await pg.screenshot(path=S+'serie-desk.png')
        await ctx.close()
        print('errors', errs)
        await b.close()
asyncio.run(main())
