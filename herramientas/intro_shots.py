import asyncio, sys, io
from playwright.async_api import async_playwright
from PIL import Image
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4420/'
OUT = '/home/claude/shots/web4-intro'
def lum(png):
    im = Image.open(io.BytesIO(png)).convert('RGB').resize((160, 90))
    px = list(im.getdata())
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return sum(0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b) for r,g,b in px)/len(px)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await b.new_context(viewport={'width':1440,'height':900})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(BASE + '?load=2200')
        for ms in (0, 300, 800):
            await pg.wait_for_timeout(ms if ms == 0 else (300 if ms == 300 else 500))
            await pg.screenshot(path=f'{OUT}-{ms:04d}ms.png')
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f'{OUT}-idle-cargado.png')
        # mantener al 50 %
        await pg.mouse.move(720, 600)
        await pg.mouse.down()
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=f'{OUT}-hold50.png')
        await pg.mouse.up()
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=f'{OUT}-soltado.png')
        # medición del obturador/flash: congelo las animaciones y recorro el tiempo
        await pg.evaluate("document.querySelector('.vf').classList.add('is-shooting','is-focused')")
        await pg.wait_for_timeout(30)
        lums = []
        for t in range(0, 620, 20):
            await pg.evaluate("""(t)=>{ for (const a of document.getAnimations()) { if (a.animationName && (a.animationName.startsWith('vf-curtain')||a.animationName==='vf-flash')) { a.pause(); a.currentTime = t; } } }""", t)
            png = await pg.screenshot(scale='css')
            L = lum(png)
            lums.append((t, round(L, 4)))
            if t in (80, 160, 200, 260):
                with open(f'{OUT}-obturador-{t:03d}ms.png', 'wb') as f: f.write(png)
        print('luminancia (ms, L):', lums)
        # transiciones de luminancia ≥ 10 % con el estado oscuro < 0.8
        vals = [l for _, l in lums]
        peaks = 0; rising = False; lo = vals[0]
        for v in vals[1:]:
            if not rising and v - lo >= 0.1 and min(lo, v) < 0.8: rising = True; hi = v
            elif rising:
                hi = max(hi, v)
                if hi - v >= 0.1: peaks += 1; rising = False; lo = v
            if not rising: lo = min(lo, v)
        print('destellos (pares subida/bajada >=10%):', peaks, 'max L', max(vals), 'min L', min(vals))
        # recargo y pruebo flujo real completo con mantener
        await pg.goto(BASE + '?load=600')
        await pg.evaluate("sessionStorage.clear()")
        await pg.reload()
        await pg.wait_for_timeout(900)
        await pg.mouse.move(720, 600); await pg.mouse.down()
        await pg.wait_for_timeout(1420)
        await pg.screenshot(path=f'{OUT}-disparo.png')
        await pg.mouse.up()
        await pg.wait_for_timeout(900)
        await pg.screenshot(path=f'{OUT}-entrada.png')
        print('entrado tras mantener:', await pg.evaluate('window.__entered'))
        # segunda visita (misma sesión): micro-transición
        await pg.reload(); await pg.wait_for_timeout(150)
        await pg.screenshot(path=f'{OUT}-revisita-150ms.png')
        await pg.wait_for_timeout(700)
        print('revisita entrada:', await pg.evaluate('window.__entered'))
        # clic rápido
        await pg.evaluate("sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
        await pg.mouse.click(720, 600)
        await pg.wait_for_timeout(900)
        print('clic rápido entra:', await pg.evaluate('window.__entered'))
        # teclado: Esc
        await pg.evaluate("sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
        print('foco inicial:', await pg.evaluate("document.activeElement.className"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        print('Esc entra:', await pg.evaluate('window.__entered'))
        # teclado: espacio mantenido
        await pg.evaluate("sessionStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
        await pg.keyboard.down(' '); await pg.wait_for_timeout(1500); await pg.keyboard.up(' ')
        await pg.wait_for_timeout(900)
        print('espacio mantenido entra:', await pg.evaluate('window.__entered'))
        # reduced motion
        c2 = await b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); p2 = await c2.new_page()
        await p2.goto(BASE); await p2.wait_for_timeout(200)
        print('reduced entra al instante:', await p2.evaluate('window.__entered'), 'vf en DOM:', await p2.evaluate("!!document.querySelector('.vf')"))
        # móvil
        c3 = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); p3 = await c3.new_page()
        await p3.goto(BASE + '?load=2200'); await p3.wait_for_timeout(1300)
        await p3.screenshot(path=f'{OUT}-movil.png')
        await p3.goto(BASE + '?lang=en&load=2200'); await p3.evaluate("sessionStorage.clear()"); await p3.reload(); await p3.wait_for_timeout(1300)
        await p3.screenshot(path=f'{OUT}-movil-en.png')
        print('errores:', errs)
        await b.close()
asyncio.run(main())
