"""Comprobación LOCAL del preview (no es el visor real de Claude): sirve la carpeta bajo un
prefijo /_f/xyz/ con una CSP parecida a la del visor y recorre la web con Playwright."""
import sys, threading, functools, http.server, socketserver, os, asyncio
from playwright.async_api import async_playwright
ROOT, NAME, PATHS = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
PREFIX='/_f/xyz/'
CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src data:; connect-src 'self'; media-src 'self' data: blob:"
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, p):
        p=p.split('?')[0].split('#')[0]
        if not p.startswith(PREFIX): return '/nonexistent'
        return os.path.join(ROOT, p[len(PREFIX):])
    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP); super().end_headers()
    def log_message(self,*a): pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),H); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{port}{PREFIX}'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for label,vp,mob in [('desk',{'width':1440,'height':900},False),('mob',{'width':390,'height':844},True)]:
            ctx=await b.new_context(viewport=vp,is_mobile=mob,has_touch=mob)
            pg=await ctx.new_page(); errs=[]; fails=[]
            pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e: errs.append('uncaught '+str(e)))
            pg.on('requestfailed',lambda r: fails.append(r.url))
            pg.on('response',lambda r: fails.append(f'{r.status} {r.url}') if r.status>=400 else None)
            for i,path in enumerate(PATHS):
                await pg.goto(BASE+path, wait_until='networkidle'); await pg.wait_for_timeout(2500)
                await pg.screenshot(path=f'/home/claude/shots/preview-{NAME}-{label}-{i}.png')
                fonts=await pg.evaluate("Array.from(document.fonts).filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight).join(', ')")
                l1=await pg.evaluate("document.documentElement.className")
                print(label,path,'| fuentes:',fonts,'| html class:',l1)
            # navegación por clic: home -> fotograma -> serie
            await pg.goto(BASE+'index.html', wait_until='networkidle'); await pg.wait_for_timeout(1200)
            sel='[data-frame]'
            if await pg.locator(sel).count():
                await pg.locator(sel).nth(1).click(); await pg.wait_for_load_state('networkidle'); await pg.wait_for_timeout(1500)
                print(label,'clic fotograma ->',pg.url.replace(BASE,''))
                await pg.screenshot(path=f'/home/claude/shots/preview-{NAME}-{label}-click.png')
            print(label,'errores:',errs[:10]); print(label,'fallos de red:',fails[:10])
            await ctx.close()
        await b.close()
asyncio.run(main())
