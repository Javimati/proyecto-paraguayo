import asyncio, sys
from playwright.async_api import async_playwright
BASE='http://localhost:4321'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for name, path, vw, vh, mobile in [
            ('home-desk','/',1440,900,False),
            ('home-mob','/',390,844,True),
            ('serie-desk','/series/prueba-calle',1440,900,False),
            ('serie-mob','/series/prueba-calle',390,844,True),
            ('editores-desk','/editores',1440,900,False),
        ]:
            ctx = await b.new_context(viewport={'width':vw,'height':vh}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
            pg = await ctx.new_page()
            errs=[]
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(BASE+path, wait_until='networkidle')
            await pg.wait_for_timeout(3000)
            await pg.screenshot(path=f'/home/claude/shots/{name}.png')
            if name=='home-desk':
                await pg.screenshot(path=f'/home/claude/shots/{name}-full.png', full_page=True)
                # lupa
                await pg.mouse.move(700,450); await pg.wait_for_timeout(200); box = await pg.locator('.frame__window').nth(2).bounding_box()
                await pg.mouse.move(box['x']+box['width']*0.5, box['y']+box['height']*0.4)
                await pg.wait_for_timeout(600)
                await pg.screenshot(path=f'/home/claude/shots/{name}-loupe.png')
            if name=='serie-desk':
                await pg.mouse.wheel(0, 1400); await pg.wait_for_timeout(2000)
                await pg.screenshot(path=f'/home/claude/shots/{name}-2.png')
            print(name, 'errors:', errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
