import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
ARTIST = "PROVISIONAL - imagen de muestra generada (no es obra de Álvaro Rodríguez)"

def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"]:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def person(d, x, base, h, fill, arms=False, rng=None):
    w = h * 0.28
    head = h * 0.13
    d.ellipse([x - head/2, base - h, x + head/2, base - h + head], fill=fill)
    d.rounded_rectangle([x - w/2, base - h + head*0.95, x + w/2, base - h*0.45], radius=w*0.3, fill=fill)
    lw = w * 0.42
    d.rectangle([x - w/2 + 2, base - h*0.48, x - w/2 + lw, base], fill=fill)
    step = rng.uniform(-0.15, 0.15) * h if rng else 0
    d.rectangle([x + w/2 - lw + step*0.3, base - h*0.48, x + w/2 - 2 + step*0.3, base], fill=fill)
    if arms:
        d.line([x - w/2, base - h*0.8, x - w*0.9, base - h*1.15], fill=fill, width=int(w*0.22))

def finish(img, rng, tint=None, vign=0.55, grain=10, blur_mask=None):
    a = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W/2)/(W/2))**2 + ((yy - H/2)/(H/2))**2)
    a *= 1 - vign * np.clip(r - 0.35, 0, 1)**1.6
    # curva S
    a = np.clip(a, 0, 1)
    a = a*a*(3 - 2*a) * 0.6 + a * 0.4
    a = a + rng.normal(0, grain/255.0, a.shape).astype(np.float32)
    a = np.clip(a, 0, 1)
    if tint is not None:
        t = np.array(tint, dtype=np.float32)
        rgb = np.stack([a]*3, -1)
        rgb = rgb * (0.75 + 0.25 * t) + (rgb * (1 - rgb)) * (t - 0.5) * 0.6
        out = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), "RGB")
    else:
        out = Image.fromarray((a * 255).astype(np.uint8), "L").convert("RGB")
    return out

def scene_street(W, H, rng, light):
    sky_top, sky_bot = (200, 235) if light else (60, 110)
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=int(sky_top + (sky_bot - sky_top) * t))
    horizon = int(H * rng.uniform(0.5, 0.68))
    x = 0
    bfill = 30 if light else 15
    while x < W:
        bw = rng.uniform(0.06, 0.18) * W
        bh = rng.uniform(0.15, 0.45) * H
        d.rectangle([x, horizon - bh, x + bw, horizon], fill=int(bfill + rng.integers(0, 25)))
        # ventanas
        if not light:
            for wy in np.arange(horizon - bh + 20, horizon - 20, 40):
                for wx in np.arange(x + 15, x + bw - 15, 35):
                    if rng.random() < 0.25:
                        d.rectangle([wx, wy, wx + 12, wy + 18], fill=170)
        x += bw + rng.uniform(0, 0.02) * W
    d.rectangle([0, horizon, W, H], fill=(150 if light else 45))
    # haz de luz dura
    lx = rng.uniform(0.2, 0.8) * W
    d.polygon([(lx, horizon), (lx + W*0.35, H), (lx + W*0.55, H), (lx + W*0.08, horizon)], fill=(225 if light else 120))
    img = img.filter(ImageFilter.GaussianBlur(2))
    d = ImageDraw.Draw(img)
    n = int(rng.integers(2, 7))
    for i in range(n):
        px = rng.uniform(0.08, 0.92) * W
        depth = rng.uniform(0, 1)
        h = H * (0.2 + 0.45 * depth)
        base = horizon + (H - horizon) * (0.15 + 0.8 * depth)
        person(d, px, base, h, fill=int(8 + 20 * (1 - depth)), rng=rng)
        # sombra alargada
        d.polygon([(px - h*0.08, base), (px + h*0.08, base), (px + h*0.9, base + h*0.12), (px + h*0.7, base + h*0.14)], fill=20)
    return img

def scene_protest(W, H, rng, light):
    img = Image.new("L", (W, H), 205 if light else 90)
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=int((205 if light else 95) - y / H * 60))
    horizon = int(H * 0.45)
    for i in range(6):
        bx = rng.uniform(0, W); bw = rng.uniform(0.1, 0.3) * W
        d.rectangle([bx, horizon - rng.uniform(0.1, 0.4) * H, bx + bw, horizon + 10], fill=int(rng.uniform(50, 120)))
    # humo
    smoke = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(smoke)
    for i in range(14):
        cx, cy, rr = rng.uniform(0, W), rng.uniform(0.1, 0.6) * H, rng.uniform(0.08, 0.25) * W
        sd.ellipse([cx - rr, cy - rr*0.6, cx + rr, cy + rr*0.6], fill=int(rng.uniform(60, 140)))
    smoke = smoke.filter(ImageFilter.GaussianBlur(W * 0.03))
    img = Image.composite(Image.new("L", (W, H), 225), img, smoke)
    d = ImageDraw.Draw(img)
    rows = 5
    for r_ in range(rows):
        depth = r_ / (rows - 1)
        h = H * (0.12 + 0.5 * depth)
        base = H * (0.55 + 0.47 * depth)
        cnt = int(26 - 18 * depth)
        for i in range(cnt):
            px = rng.uniform(-0.05, 1.05) * W
            person(d, px, base, h * rng.uniform(0.9, 1.1), fill=int(15 + 70 * (1 - depth)), arms=rng.random() < 0.25, rng=rng)
        if rng.random() < 0.8:
            # pancarta
            bx = rng.uniform(0.05, 0.6) * W; bw = rng.uniform(0.15, 0.35) * W; by = base - h * 1.25
            d.rectangle([bx, by, bx + bw, by + h * 0.28], fill=int(200 + 30 * rng.random()))
            for k in range(3):
                ly = by + h * (0.06 + 0.07 * k)
                d.line([bx + bw*0.08, ly, bx + bw * rng.uniform(0.5, 0.92), ly], fill=40, width=max(3, int(h*0.03)))
            d.line([bx + 10, by + h*0.28, bx + 10, by + h * 0.9], fill=30, width=8)
            d.line([bx + bw - 10, by + h*0.28, bx + bw - 10, by + h * 0.9], fill=30, width=8)
    return img

def scene_concert(W, H, rng, light):
    img = Image.new("L", (W, H), 12)
    lights = Image.new("L", (W, H), 0)
    ld = ImageDraw.Draw(lights)
    for i in range(int(rng.integers(3, 7))):
        sx = rng.uniform(0.1, 0.9) * W; sy = -H * 0.05
        ang = rng.uniform(-0.5, 0.5); spread = rng.uniform(0.08, 0.2)
        L = H * 1.3
        p1 = (sx + L * math.sin(ang - spread), sy + L * math.cos(ang - spread))
        p2 = (sx + L * math.sin(ang + spread), sy + L * math.cos(ang + spread))
        ld.polygon([(sx, sy), p1, p2], fill=int(rng.uniform(70, 150)))
    lights = lights.filter(ImageFilter.GaussianBlur(W * 0.015))
    img = Image.fromarray(np.clip(np.asarray(img, np.int16) + np.asarray(lights, np.int16), 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    # escenario y músico a contraluz
    stage = H * 0.62
    d.rectangle([0, stage, W, H], fill=18)
    mx = rng.uniform(0.3, 0.7) * W
    person(d, mx, stage, H * 0.42, fill=5, arms=True, rng=rng)
    d.line([mx + H*0.05, stage - H*0.25, mx + H*0.22, stage - H*0.17], fill=5, width=int(H*0.025))  # guitarra/mástil
    # público
    for i in range(40):
        px = rng.uniform(-0.05, 1.05) * W
        h = H * rng.uniform(0.25, 0.4)
        person(d, px, H * 1.08, h, fill=int(rng.uniform(0, 14)), arms=rng.random() < 0.4, rng=rng)
    # foco caliente
    cx, cy = rng.uniform(0.2, 0.8) * W, H * 0.05
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([cx - W*0.06, cy - W*0.06, cx + W*0.06, cy + W*0.06], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.04))
    img = Image.fromarray(np.clip(np.asarray(img, np.int16) + np.asarray(glow, np.int16), 0, 255).astype(np.uint8))
    if light:
        img = img.point(lambda v: min(255, int(v * 1.6 + 20)))
    return img

SERIES = {
    "prueba-calle": (scene_street, None),
    "prueba-manifestacion": (scene_protest, None),
    "prueba-concierto": (scene_concert, "tint"),
}
TINTS = [(0.85, 0.45, 0.35), (0.4, 0.5, 0.85), (0.8, 0.35, 0.6), (0.85, 0.6, 0.3)]

for si, (slug, (fn, tint)) in enumerate(SERIES.items()):
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    for i in range(8):
        rng = np.random.default_rng(1000 * si + i + 7)
        vertical = i in (3, 6)
        W, H = (1600, 2400) if vertical else (2400, 1600)
        light = i in (1, 4, 7)
        img = fn(W, H, rng, light)
        if i in (2, 5):  # desenfoque de movimiento simulado
            img = img.filter(ImageFilter.BoxBlur(3))
        t = TINTS[i % 4] if tint else None
        out = finish(img, rng, tint=t, vign=0.5 if light else 0.65)
        d = ImageDraw.Draw(out)
        f = font(26)
        txt = "PROVISIONAL · muestra generada"
        tw = d.textlength(txt, font=f)
        lum = np.asarray(out.convert("L"))[H-80:H-20, int(W - tw - 60):W-20].mean()
        d.text((W - tw - 40, H - 62), txt, font=f, fill=(30, 30, 30) if lum > 140 else (215, 215, 215))
        exif = Image.Exif()
        exif[0x013B] = ARTIST
        exif[0x8298] = ARTIST
        exif[0x010E] = "Imagen provisional generada por ordenador para pruebas de diseño"
        p = os.path.join(OUT, slug, f"{i+1:02d}.jpg")
        out.save(p, "JPEG", quality=82, progressive=True, optimize=True, exif=exif.tobytes())
        print(p, os.path.getsize(p) // 1024, "KB")
