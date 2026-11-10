import asyncio
from playwright.async_api import async_playwright
B='http://localhost:4350'
GL=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});window.__GL_NO_FPS_GUARD=true;"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=GL)
        errs=[]
        ctx=await b.new_context(viewport={'width':1440,'height':900}); await ctx.add_init_script(INIT)
        pg=await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B+'/', wait_until='domcontentloaded'); await pg.wait_for_timeout(450)
        await pg.screenshot(path='/home/claude/shots/web3-intro-mid.png')
        await pg.wait_for_timeout(3500)
        # teclado: tab hasta la primera diapositiva
        for _ in range(40):
            await pg.keyboard.press('Tab')
            if await pg.evaluate("!!document.activeElement.closest('[data-slide]')"): break
        print('focus on slide:', await pg.evaluate("document.activeElement.querySelector('.slide__label .num')?.textContent"))
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(700)
        print('after right:', await pg.evaluate("document.activeElement.querySelector('.slide__label .num')?.textContent"))
        await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(900)
        print('after down:', await pg.evaluate("document.activeElement.querySelector('.slide__label .num')?.textContent"))
        await pg.screenshot(path='/home/claude/shots/web3-keyboard.png')
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/web3-vt-mid.png')
        await pg.wait_for_timeout(2500); print('url after enter:', pg.url)
        await pg.screenshot(path='/home/claude/shots/web3-vt-end.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(2500); print('after esc:', pg.url, await pg.evaluate("document.documentElement.className"))
        # mobile filter
        m=await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); mp=await m.new_page(); mp.on('pageerror', lambda e: errs.append(str(e)))
        await mp.goto(B+'/', wait_until='networkidle'); await mp.wait_for_timeout(800)
        await mp.tap('[data-filter="bodas"]'); await mp.wait_for_timeout(1300)
        print('mobile visible slides:', await mp.evaluate("[...document.querySelectorAll('.slide')].filter(s=>!s.hidden).length"), 'url', mp.url)
        await mp.screenshot(path='/home/claude/shots/web3-mob-filter.png')
        # no JS
        n=await b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); np_=await n.new_page()
        await np_.goto(B+'/', wait_until='networkidle'); await np_.screenshot(path='/home/claude/shots/web3-nojs.png')
        # reduced motion
        r=await b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); rp=await r.new_page(); rp.on('pageerror', lambda e: errs.append(str(e)))
        await rp.goto(B+'/', wait_until='networkidle'); await rp.wait_for_timeout(500); await rp.screenshot(path='/home/claude/shots/web3-reduced.png')
        print('reduced classes:', await rp.evaluate("document.documentElement.className"))
        # en
        await rp.goto(B+'/en/work/weddings', wait_until='networkidle'); print('en title:', await rp.title())
        print('errors', errs)
        await b.close()
asyncio.run(main())
