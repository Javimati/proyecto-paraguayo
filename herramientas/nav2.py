import asyncio
from playwright.async_api import async_playwright
B='http://localhost:4330'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await (await b.new_context(viewport={'width':1440,'height':900})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(2600)
        # teclado
        await pg.keyboard.press('Tab'); 
        for i in range(8):
            await pg.keyboard.press('Tab')
            t = await pg.evaluate("document.activeElement.className+'|'+(document.activeElement.textContent||'').trim().slice(0,30)")
            if 'show__link' in t: break
        print('focus:', t)
        await pg.keyboard.press('ArrowDown'); print('after down:', await pg.evaluate("document.activeElement.textContent.trim().slice(0,25)"), '| active li:', await pg.evaluate("document.querySelector('.show.is-active .show__title').textContent"))
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200); await pg.screenshot(path='/home/claude/shots/web2-vt-mid.png'); await pg.wait_for_timeout(1500)
        print('url:', pg.url); await pg.screenshot(path='/home/claude/shots/web2-vt-end.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500); print('esc ->', pg.url)
        c2 = await b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); p2 = await c2.new_page()
        await p2.goto(B+'/', wait_until='networkidle'); await p2.screenshot(path='/home/claude/shots/web2-nojs-home.png')
        await p2.goto(B+'/eventos/prueba-club', wait_until='networkidle'); await p2.screenshot(path='/home/claude/shots/web2-nojs-event.png')
        c3 = await b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); p3 = await c3.new_page(); reqs=[]
        p3.on('request', lambda r: reqs.append(r.url))
        await p3.goto(B+'/eventos/prueba-club', wait_until='networkidle'); await p3.wait_for_timeout(500)
        print('reduced: html', await p3.evaluate("document.documentElement.className"), '| motion chunk:', any('motion-desktop' in r for r in reqs))
        await p3.screenshot(path='/home/claude/shots/web2-reduced-event.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
