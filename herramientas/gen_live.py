"""Genera fotos PROVISIONALES de directo (conciertos, festival, club, acústico) para la web 2.
Uso: python3 -I gen_live.py <carpeta_series>
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
ARTIST = "PROVISIONAL - imagen de muestra generada (no es obra de Álvaro Rodríguez)"
LONG = 1800

GELS = {
    'magenta': (1.0, 0.18, 0.62), 'ambar': (1.0, 0.62, 0.18), 'azul': (0.22, 0.42, 1.0),
    'cian': (0.2, 0.85, 1.0), 'rojo': (1.0, 0.12, 0.1), 'violeta': (0.55, 0.25, 1.0),
    'blanco': (1.0, 0.95, 0.88), 'verdeazul': (0.15, 0.9, 0.7), 'sodio': (1.0, 0.75, 0.35),
}

def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def mask(W, H):
    return Image.new('L', (W, H), 0)

def add(canvas, m, color, strength=1.0, blur=0):
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(m, dtype=np.float32)[..., None] / 255.0
    canvas += a * np.array(color, dtype=np.float32) * strength

def beam(W, H, rng, x0, y0, angle, spread, length, color, strength):
    m = mask(W, H)
    d = ImageDraw.Draw(m)
    a1, a2 = angle - spread, angle + spread
    p1 = (x0 + math.sin(a1) * length, y0 + math.cos(a1) * length)
    p2 = (x0 + math.sin(a2) * length, y0 + math.cos(a2) * length)
    d.polygon([(x0, y0), p1, p2], fill=int(150 + rng.integers(0, 80)))
    # más intenso en el núcleo
    m2 = mask(W, H)
    d2 = ImageDraw.Draw(m2)
    s2 = spread * 0.35
    q1 = (x0 + math.sin(angle - s2) * length, y0 + math.cos(angle - s2) * length)
    q2 = (x0 + math.sin(angle + s2) * length, y0 + math.cos(angle + s2) * length)
    d2.polygon([(x0, y0), q1, q2], fill=200)
    return m, m2

def haze(W, H, rng, amount):
    small = rng.random((H // 60 + 2, W // 60 + 2)).astype(np.float32)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(40))
    return np.asarray(img, dtype=np.float32)[..., None] / 255.0 * amount

def person(d, x, base, h, fill, kind='stand', rng=None):
    w = h * 0.27
    head = h * 0.13
    d.ellipse([x - head / 2, base - h, x + head / 2, base - h + head], fill=fill)
    d.rounded_rectangle([x - w / 2, base - h + head * 0.95, x + w / 2, base - h * 0.45], radius=w * 0.3, fill=fill)
    lw = w * 0.42
    d.polygon([(x - w / 2 + 2, base - h * 0.48), (x - w / 2 + lw, base - h * 0.48), (x - w * 0.15, base), (x - w * 0.75, base)], fill=fill)
    d.polygon([(x + w / 2 - lw, base - h * 0.48), (x + w / 2 - 2, base - h * 0.48), (x + w * 0.8, base), (x + w * 0.2, base)], fill=fill)
    lwid = max(2, int(w * 0.2))
    if kind == 'guitar':
        d.polygon([(x - w * 0.9, base - h * 0.5), (x + w * 0.3, base - h * 0.62), (x + w * 0.4, base - h * 0.42), (x - w * 0.6, base - h * 0.36)], fill=fill)
        d.line([(x + w * 0.3, base - h * 0.55), (x + w * 1.6, base - h * 0.8)], fill=fill, width=max(2, int(w * 0.09)))
        d.line([(x - w / 2, base - h * 0.78), (x - w * 0.2, base - h * 0.5)], fill=fill, width=lwid)
    elif kind == 'sing':
        d.line([(x + w * 0.9, base), (x + w * 0.9, base - h * 0.85)], fill=fill, width=max(2, int(w * 0.07)))
        d.line([(x + w * 0.9, base - h * 0.85), (x + w * 0.2, base - h * 0.88)], fill=fill, width=max(2, int(w * 0.07)))
        d.line([(x - w / 2, base - h * 0.8), (x - w * 1.3, base - h * 1.05)], fill=fill, width=lwid)
    elif kind == 'arms':
        d.line([(x - w / 2, base - h * 0.8), (x - w * 0.9, base - h * 1.2)], fill=fill, width=lwid)
        d.line([(x + w / 2, base - h * 0.8), (x + w * 0.9, base - h * 1.2)], fill=fill, width=lwid)

def crowd(d, W, H, rng, top, fill_base, phones=None, density=1.0):
    n = int(W / 26 * density)
    for i in range(n):
        x = rng.uniform(-20, W + 20)
        depth = rng.uniform(0, 1)
        h = H * (0.18 + 0.32 * depth)
        base = top + (H - top) * (0.4 + 0.9 * depth)
        kind = 'arms' if rng.random() < 0.18 else 'stand'
        f = int(fill_base * (1 - depth))
        person(d, x, base, h, fill=(f, f, f), kind=kind, rng=rng)
        if phones is not None and rng.random() < 0.06:
            px, py = x + h * 0.2, base - h * 1.12
            phones.append((px, py, h * 0.05))

def drum(d, x, base, s, fill):
    d.ellipse([x - s, base - s * 1.1, x + s, base + s * 0.4], fill=fill)
    d.ellipse([x - s * 2.2, base - s * 1.5, x - s * 1.1, base - s * 0.9], fill=fill)
    d.ellipse([x + s * 1.1, base - s * 1.7, x + s * 2.4, base - s * 1.2], fill=fill)
    d.line([(x - s * 1.6, base - s * 1.2), (x - s * 1.6, base + s * 0.4)], fill=fill, width=3)

def tonemap(c, exposure=1.0):
    c = 1 - np.exp(-c * exposure)
    return np.clip(c, 0, 1)

def finish(rgb, rng, grain=0.035, vign=0.6, motion=0):
    H, W, _ = rgb.shape
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    rgb *= (1 - vign * np.clip(r - 0.4, 0, 1) ** 1.5)[..., None]
    rgb += rng.normal(0, grain, (H, W, 1)).astype(np.float32) * (0.4 + rgb.mean(-1, keepdims=True))
    rgb = np.clip(rgb, 0, 1)
    img = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB')
    if motion:
        k = int(motion)
        img = img.filter(ImageFilter.BoxBlur(1))
        arr = np.asarray(img, dtype=np.float32)
        acc = np.zeros_like(arr)
        for i in range(k):
            acc += np.roll(arr, i - k // 2, axis=1)
        img = Image.fromarray((acc / k).astype(np.uint8))
    return img

def stage_scene(W, H, rng, gels, style):
    c = np.zeros((H, W, 3), np.float32)
    # fondo: oscuridad con algo de color
    base = np.array(GELS[gels[0]]) * 0.03
    c += base
    if style == 'festival':
        for y in range(H):
            t = y / H
            c[y] += np.array([0.18, 0.12, 0.3]) * max(0, 0.6 - t) * 1.6 + np.array([0.6, 0.3, 0.2]) * max(0, 0.45 - abs(t - 0.42)) * 0.6
    stage_y = int(H * rng.uniform(0.58, 0.7))
    # luces de la parrilla
    n_l = int(rng.integers(4, 9))
    xs = np.linspace(W * 0.1, W * 0.9, n_l) + rng.normal(0, W * 0.02, n_l)
    top = H * rng.uniform(0.02, 0.12)
    for i, x in enumerate(xs):
        g = GELS[gels[i % len(gels)]]
        ang = rng.uniform(-0.45, 0.45)
        m, core = beam(W, H, rng, x, top, ang, rng.uniform(0.05, 0.13), H * 1.4, g, 1)
        add(c, m, g, strength=rng.uniform(0.18, 0.4), blur=18)
        add(c, core, g, strength=rng.uniform(0.15, 0.3), blur=8)
        # foco con bloom
        f = mask(W, H)
        ImageDraw.Draw(f).ellipse([x - 14, top - 14, x + 14, top + 14], fill=255)
        add(c, f, g, strength=2.5, blur=6)
        add(c, f, g, strength=1.2, blur=40)
    if style == 'club':
        for i in range(int(rng.integers(6, 14))):
            g = GELS[gels[(i + 1) % len(gels)]]
            m = mask(W, H)
            x0 = W * rng.uniform(0.4, 0.6)
            y0 = stage_y - H * 0.15
            ImageDraw.Draw(m).line([(x0, y0), (rng.uniform(-W * 0.2, W * 1.2), rng.uniform(-H * 0.2, H * 0.3))], fill=255, width=3)
            add(c, m, g, strength=1.4, blur=1.5)
            add(c, m, g, strength=0.5, blur=10)
    c *= 1 + haze(W, H, rng, 0.9)
    c += haze(W, H, rng, 0.06) * np.array(GELS[gels[-1]])
    # siluetas
    img = Image.fromarray((tonemap(c, 1.4) * 255).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(img)
    # escenario
    d.rectangle([0, stage_y, W, stage_y + H * 0.04], fill=(10, 10, 12))
    band = int(rng.integers(1, 4)) if style in ('sala', 'festival') else 1
    if style == 'club':
        d.rectangle([W * 0.38, stage_y - H * 0.12, W * 0.62, stage_y], fill=(8, 8, 10))
        person(d, W * 0.5, stage_y - H * 0.09, H * 0.32, fill=(6, 6, 8), kind='arms' if rng.random() < 0.5 else 'stand')
    elif style == 'acustico':
        person(d, W * rng.uniform(0.4, 0.6), stage_y, H * 0.42, fill=(6, 5, 5), kind='guitar')
    else:
        slots = [0.25, 0.5, 0.75]
        kinds = ['guitar', 'sing', 'guitar']
        for i in range(3):
            if i == 1 or rng.random() < 0.8:
                person(d, W * slots[i] + rng.normal(0, W * 0.03), stage_y, H * (0.36 if i == 1 else 0.33), fill=(7, 7, 9), kind=kinds[i])
        drum(d, W * 0.5 + rng.normal(0, W * 0.05), stage_y - H * 0.04, H * 0.05, (9, 9, 11))
    phones = []
    if style != 'acustico' or rng.random() < 0.5:
        crowd(d, W, H, rng, stage_y + H * 0.02, 22, phones, density=1.3 if style == 'festival' else 1.0)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    for (px, py, s) in phones:
        m = mask(W, H)
        ImageDraw.Draw(m).rectangle([px - s * 0.5, py - s, px + s * 0.5, py + s], fill=255)
        add(arr, m, (0.9, 0.95, 1.0), strength=0.9, blur=1)
        add(arr, m, (0.6, 0.7, 1.0), strength=0.25, blur=12)
    return arr

def portrait_scene(W, H, rng, gels, style):
    # vertical: un músico a contraluz con un haz cenital
    c = np.zeros((H, W, 3), np.float32) + np.array(GELS[gels[0]]) * 0.02
    g = GELS[gels[0]]
    m, core = beam(W, H, rng, W * rng.uniform(0.35, 0.65), -H * 0.05, rng.uniform(-0.12, 0.12), 0.2, H * 1.3, g, 1)
    add(c, m, g, strength=0.5, blur=30)
    add(c, core, GELS['blanco'], strength=0.35, blur=12)
    g2 = GELS[gels[1 % len(gels)]]
    m2, _ = beam(W, H, rng, W * 1.05, H * 0.1, -0.9, 0.15, W * 1.6, g2, 1)
    add(c, m2, g2, strength=0.35, blur=24)
    c *= 1 + haze(W, H, rng, 1.0)
    img = Image.fromarray((tonemap(c, 1.5) * 255).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(img)
    base = H * rng.uniform(0.86, 0.98)
    kind = {'club': 'arms', 'acustico': 'guitar'}.get(style, 'sing' if rng.random() < 0.5 else 'guitar')
    person(d, W * rng.uniform(0.4, 0.6), base, H * 0.62, fill=(6, 6, 7), kind=kind)
    if style != 'acustico':
        crowd(d, W, H, rng, H * 0.82, 16, None, density=0.6)
    return np.asarray(img, dtype=np.float32) / 255.0

EVENTS = {
    'prueba-sala': ('sala', [['magenta', 'azul', 'ambar'], ['rojo', 'ambar'], ['azul', 'cian', 'blanco'], ['violeta', 'magenta']]),
    'prueba-festival': ('festival', [['ambar', 'sodio', 'magenta'], ['cian', 'azul'], ['ambar', 'rojo'], ['blanco', 'azul', 'violeta']]),
    'prueba-club': ('club', [['magenta', 'azul'], ['verdeazul', 'violeta'], ['rojo', 'magenta'], ['azul', 'cian']]),
    'prueba-acustico': ('acustico', [['sodio', 'ambar'], ['ambar', 'rojo'], ['sodio', 'azul'], ['blanco', 'ambar']]),
}

def exif_bytes():
    ex = Image.Exif()
    ex[0x013B] = ARTIST  # Artist
    ex[0x8298] = ARTIST  # Copyright
    ex[0x010E] = 'Imagen provisional generada para maquetar'
    return ex.tobytes()

def main():
    for slug, (style, palettes) in EVENTS.items():
        folder = os.path.join(OUT, slug)
        os.makedirs(folder, exist_ok=True)
        rng0 = np.random.default_rng(abs(hash(slug)) % (2**32))
        for i in range(1, 9):
            rng = np.random.default_rng(rng0.integers(0, 2**31))
            gels = palettes[(i - 1) % len(palettes)]
            if i in (4, 7):
                W, H = LONG * 2 // 3, LONG
                arr = portrait_scene(W, H, rng, gels, style)
            else:
                W, H = LONG, LONG * 2 // 3
                arr = stage_scene(W, H, rng, gels, style)
            img = finish(arr, rng, motion=9 if i in (3, 6) else 0)
            d = ImageDraw.Draw(img)
            f = font(max(12, W // 110))
            txt = 'PROVISIONAL · muestra generada'
            tw = d.textlength(txt, font=f)
            d.text((W - tw - W * 0.015, H - H * 0.035), txt, font=f, fill=(200, 200, 200))
            p = os.path.join(folder, f'{i:02d}.jpg')
            img.save(p, 'JPEG', quality=82, progressive=True, optimize=True, exif=exif_bytes())
            print(p, os.path.getsize(p) // 1024, 'KB')

if __name__ == '__main__':
    main()
