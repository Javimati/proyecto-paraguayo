import asyncio, sys
from playwright.async_api import async_playwright
BASE='http://localhost:4350'
GL_ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__GL_NO_FPS_GUARD=true;"
which = sys.argv[1:] or ['all']
async def shot(b, name, path, vw, vh, mobile=False, gl=False, actions=None, wait=3000, reduced=False):
    ctx = await b.new_context(viewport={'width':vw,'height':vh}, is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if reduced else 'no-preference')
    if gl: await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    errs=[]
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    await pg.goto(BASE+path, wait_until='networkidle')
    await pg.wait_for_timeout(wait)
    await pg.screenshot(path=f'/home/claude/shots/web3-{name}.png')
    if actions: await actions(pg)
    print(name, 'webgl' if await pg.evaluate("document.documentElement.classList.contains('webgl')") else 'no-gl', 'errors:', errs[:6])
    await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=GL_ARGS)
        async def drag(pg):
            await pg.mouse.move(700,450); await pg.mouse.down(); await pg.mouse.move(400,300, steps=12); await pg.mouse.up()
            await pg.wait_for_timeout(1200); await pg.screenshot(path='/home/claude/shots/web3-home-gl-drag.png')
            await pg.mouse.move(720,440); await pg.wait_for_timeout(600); await pg.screenshot(path='/home/claude/shots/web3-home-gl-hover.png')
            await pg.click('[data-filter="calle"]'); await pg.wait_for_timeout(1400); await pg.screenshot(path='/home/claude/shots/web3-home-gl-filter.png')
        async def intro(pg):
            pass
        await shot(b,'home-desk','/',1440,900, wait=2600)
        await shot(b,'home-gl','/',1440,900, gl=True, actions=drag, wait=4000)
        await shot(b,'home-mob','/',390,844, mobile=True)
        await shot(b,'serie-desk','/series/prueba-manifestacion',1440,900)
        async def scroll(pg):
            await pg.mouse.wheel(0,1100); await pg.wait_for_timeout(250); await pg.screenshot(path='/home/claude/shots/web3-serie-gl-scrolling.png')
            await pg.wait_for_timeout(1800); await pg.screenshot(path='/home/claude/shots/web3-serie-gl-rest.png')
        await shot(b,'serie-gl','/series/prueba-concierto',1440,900, gl=True, actions=scroll, wait=3500)
        await shot(b,'serie-mob','/series/prueba-calle',390,844, mobile=True)
        await shot(b,'trabajo','/trabajo/calle',1440,900)
        await shot(b,'editores','/editores',1440,900)
        await shot(b,'encargos','/encargos',1440,900)
        await shot(b,'sobre','/sobre',1440,900)
        await shot(b,'contacto','/en/contact',1440,900)
        await shot(b,'404','/nada',1440,900)
        await b.close()
asyncio.run(main())
