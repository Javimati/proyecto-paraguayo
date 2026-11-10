import asyncio, json
from playwright.async_api import async_playwright
B='http://localhost:4322'
ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
INIT="Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});"
async def run(b, name, path, vw=1440, vh=900, mobile=False, reduced='no-preference', cores=True, actions=None):
    ctx = await b.new_context(viewport={'width':vw,'height':vh}, is_mobile=mobile, has_touch=mobile, reduced_motion=reduced)
    if cores: await ctx.add_init_script(INIT)
    pg = await ctx.new_page()
    reqs=[]; errs=[]; logs=[]
    pg.on('request', lambda r: reqs.append(r.url))
    pg.on('console', lambda m: (errs if m.type=='error' else logs).append(m.text))
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(B+path, wait_until='networkidle')
    if actions: await actions(pg)
    gl = any('webgl-layer' in u for u in reqs)
    state = await pg.evaluate("({gl: document.documentElement.classList.contains('gl'), canvas: !!document.querySelector('.gl-layer'), glon: document.querySelectorAll('.gl-on').length, bail: document.documentElement.classList.contains('gl-bailout')})")
    print(f'{name}: chunk={gl} state={state} errors={errs} logs={[l for l in logs if "capa" in l]}')
    await ctx.close()
async def home_actions(pg):
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path='/home/claude/shots/web1-gl-home-top.png')
    await pg.mouse.move(700,500)
    await pg.mouse.wheel(0, 700)
    for i,t in enumerate([150, 300, 700]):
        await pg.wait_for_timeout(t if i==0 else t-[150,300,700][i-1])
        await pg.screenshot(path=f'/home/claude/shots/web1-gl-home-reveal-{t}.png')
async def serie_actions(pg):
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path='/home/claude/shots/web1-gl-serie-top.png')
    await pg.mouse.move(700,500)
    for _ in range(6):
        await pg.mouse.wheel(0, 500); await pg.wait_for_timeout(16)
    await pg.wait_for_timeout(60)
    await pg.screenshot(path='/home/claude/shots/web1-gl-serie-fastscroll.png')
    await pg.wait_for_timeout(1500)
    await pg.screenshot(path='/home/claude/shots/web1-gl-serie-rest.png')
    bg = await pg.evaluate("getComputedStyle(document.body).backgroundColor")
    print('   body bg', bg)
async def nav_actions(pg):
    await pg.wait_for_timeout(3500)
    await pg.locator('.frame--selected a').nth(1).click()
    await pg.wait_for_timeout(300); await pg.screenshot(path='/home/claude/shots/web1-gl-vt-mid.png')
    await pg.wait_for_timeout(3000); await pg.screenshot(path='/home/claude/shots/web1-gl-vt-end.png')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        await run(b,'home-desk-gl','/',actions=home_actions)
        await run(b,'serie-desk-gl','/series/prueba-calle',actions=serie_actions)
        await run(b,'nav-home-serie','/',actions=nav_actions)
        await run(b,'reduced','/',reduced='reduce',actions=lambda pg: pg.wait_for_timeout(3500))
        await run(b,'mobile','/',vw=390,vh=844,mobile=True,actions=lambda pg: pg.wait_for_timeout(3500))
        await run(b,'low-cores','/',cores=False,actions=lambda pg: pg.wait_for_timeout(3500))
        await b.close()
asyncio.run(main())
