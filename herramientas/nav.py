import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await (await b.new_context(viewport={'width':1440,'height':900})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4321/', wait_until='networkidle'); await pg.wait_for_timeout(1500)
        await pg.locator('.frame--selected a').nth(1).click()
        await pg.wait_for_timeout(250); await pg.screenshot(path='shots/vt-mid.png')
        await pg.wait_for_timeout(1500); await pg.screenshot(path='shots/vt-end.png')
        print('url', pg.url)
        # teclado: Escape vuelve
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500); print('after esc', pg.url)
        # flechas en la hoja
        await pg.locator('[data-frame]').first.focus(); await pg.keyboard.press('ArrowDown'); 
        print('focused after down:', await pg.evaluate("document.activeElement.querySelector('.frame__edge span').textContent"))
        await pg.keyboard.press('ArrowRight'); print('after right:', await pg.evaluate("document.activeElement.querySelector('.frame__edge span').textContent"))
        # sin JS
        ctx2 = await b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); p2=await ctx2.new_page()
        await p2.goto('http://localhost:4321/series/prueba-calle', wait_until='networkidle'); await p2.screenshot(path='shots/nojs-serie.png')
        # reduced motion
        ctx3 = await b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); p3=await ctx3.new_page()
        await p3.goto('http://localhost:4321/', wait_until='networkidle'); await p3.wait_for_timeout(300); await p3.screenshot(path='shots/reduced-home.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
