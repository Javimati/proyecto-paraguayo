import asyncio, sys
from playwright.async_api import async_playwright
BASE='http://localhost:4330'
ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});"
which = sys.argv[1:] or ['all']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        jobs=[('home-desk','/',1440,900,False),('home-mob','/',390,844,True),('event-desk','/eventos/prueba-sala',1440,900,False),('event-mob','/eventos/prueba-sala',390,844,True),('promo-desk','/para-promotores',1440,900,False),('promo-mob','/para-promotores',390,844,True),('about-desk','/sobre',1440,900,False),('404-desk','/nope',1440,900,False)]
        for name,path,vw,vh,mob in jobs:
            if which!=['all'] and name not in which: continue
            ctx = await b.new_context(viewport={'width':vw,'height':vh}, is_mobile=mob, has_touch=mob)
            await ctx.add_init_script(INIT)
            pg = await ctx.new_page(); errs=[]; reqs=[]
            pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning','info') else None)
            pg.on('pageerror', lambda e: errs.append('pageerror '+str(e)))
            pg.on('request', lambda r: reqs.append(r.url))
            await pg.goto(BASE+path+('?glforce' if 'desk' in name else ''), wait_until='networkidle'); await pg.wait_for_timeout(3500)
            await pg.screenshot(path=f'/home/claude/shots/web2-{name}.png')
            gl = await pg.evaluate("document.documentElement.className")
            print(name, 'html:', gl, '| gl chunk:', any('stage-gl' in r for r in reqs), '|', errs[:6])
            if name=='home-desk':
                link = pg.locator('[data-show-link]').nth(2)
                await link.hover(); await pg.wait_for_timeout(250)
                await pg.screenshot(path='/home/claude/shots/web2-home-hover-flash.png')
                await pg.wait_for_timeout(900)
                box = await pg.locator('.show.is-active [data-stage-img]').bounding_box()
                await pg.mouse.move(box['x']+box['width']*0.35, box['y']+box['height']*0.45); await pg.wait_for_timeout(700)
                await pg.screenshot(path='/home/claude/shots/web2-home-spot.png')
            if name=='event-desk':
                await pg.mouse.move(700,400)
                for i in range(6):
                    await pg.mouse.wheel(0, 500); await pg.wait_for_timeout(40)
                await pg.screenshot(path='/home/claude/shots/web2-event-smear.png')
                await pg.wait_for_timeout(1500)
                await pg.screenshot(path='/home/claude/shots/web2-event-rest.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
