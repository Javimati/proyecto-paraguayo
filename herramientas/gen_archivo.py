# Genera fotos PROVISIONALES para la web 3 (alvaro-archivo). Lado largo 1800 px.
import sys, os, math
src = open('/home/claude/tools/gen_placeholders.py').read().split('SERIES = {')[0]
src = src.replace("OUT = sys.argv[1]", "OUT = sys.argv[1] if len(sys.argv) > 1 else '.'")
exec(src)
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def add(img, layer):
    return Image.fromarray(np.clip(np.asarray(img, np.int16) + np.asarray(layer, np.int16), 0, 255).astype(np.uint8))

def scene_party(W, H, rng, light):
    img = Image.new("L", (W, H), 10)
    bok = Image.new("L", (W, H), 0); bd = ImageDraw.Draw(bok)
    for i in range(60):
        cx, cy, r = rng.uniform(0, W), rng.uniform(0, H*0.6), rng.uniform(0.01, 0.05)*W
        bd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=int(rng.uniform(40, 160)))
    bok = bok.filter(ImageFilter.GaussianBlur(W*0.006))
    img = add(img, bok)
    d = ImageDraw.Draw(img)
    for row in range(3):
        depth = row/2
        for i in range(int(18 - 8*depth)):
            px = rng.uniform(-0.05, 1.05)*W
            h = H*(0.35 + 0.35*depth)
            person(d, px, H*(0.95 + 0.2*depth), h, fill=int(4 + 30*(1-depth)), arms=rng.random() < 0.6, rng=rng)
    if light:  # flash directo
        fl = Image.new("L", (W, H), 0)
        ImageDraw.Draw(fl).ellipse([W*0.25, H*0.35, W*0.75, H*1.1], fill=120)
        img = add(img, fl.filter(ImageFilter.GaussianBlur(W*0.08)))
    return img

def scene_wedding(W, H, rng, light):
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=int(238 - 40*(y/H)**2))
    # arco de flores / ventanal
    cx = W*rng.uniform(0.4, 0.6)
    d.arc([cx - W*0.35, H*0.05, cx + W*0.35, H*1.2], 180, 360, fill=150, width=int(W*0.05))
    leaves = Image.new("L", (W, H), 0); ld = ImageDraw.Draw(leaves)
    for i in range(90):
        a = rng.uniform(math.pi, 2*math.pi); rr = W*0.35
        x = cx + rr*math.cos(a)*rng.uniform(0.95, 1.08); y = H*0.62 + H*0.57*math.sin(a)*rng.uniform(0.95, 1.05)
        s = rng.uniform(0.008, 0.025)*W
        ld.ellipse([x-s, y-s, x+s, y+s], fill=int(rng.uniform(40, 110)))
    img = Image.fromarray(np.clip(np.asarray(img, np.int16) - np.asarray(leaves.filter(ImageFilter.GaussianBlur(3)), np.int16), 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    base = H*0.97
    person(d, cx - W*0.06, base, H*0.55, fill=70, rng=rng)
    # vestido: trapecio claro con contorno
    bx = cx + W*0.06
    d.ellipse([bx - H*0.035, base - H*0.55, bx + H*0.035, base - H*0.48], fill=80)
    d.polygon([(bx - H*0.04, base - H*0.47), (bx + H*0.04, base - H*0.47), (bx + H*0.16, base), (bx - H*0.16, base)], fill=225, outline=120)
    img = img.filter(ImageFilter.GaussianBlur(1.5))
    return img

def scene_reportage(W, H, rng, light):
    img = Image.new("L", (W, H), 28)
    d = ImageDraw.Draw(img)
    # ventana con luz lateral
    wx = W*rng.uniform(0.05, 0.25); ww = W*0.22
    d.rectangle([wx, H*0.12, wx+ww, H*0.62], fill=235 if light else 190)
    d.line([wx+ww/2, H*0.12, wx+ww/2, H*0.62], fill=40, width=14)
    d.line([wx, H*0.37, wx+ww, H*0.37], fill=40, width=14)
    beam = Image.new("L", (W, H), 0)
    ImageDraw.Draw(beam).polygon([(wx, H*0.12), (wx+ww, H*0.12), (wx+ww+W*0.5, H), (wx+W*0.15, H)], fill=70)
    img = add(img, beam.filter(ImageFilter.GaussianBlur(W*0.03)))
    d = ImageDraw.Draw(img)
    # mesa y figura sentada
    d.rectangle([W*0.35, H*0.66, W*0.95, H*0.7], fill=15)
    d.rectangle([W*0.4, H*0.7, W*0.43, H], fill=12); d.rectangle([W*0.88, H*0.7, W*0.91, H], fill=12)
    person(d, W*rng.uniform(0.55, 0.75), H*0.86, H*0.5, fill=10, rng=rng)
    d.ellipse([W*0.6, H*0.62, W*0.66, H*0.66], fill=60)
    return img

PLAN = [
    # slug, escena, tinte, n, verticales
    ("prueba-manifestacion", scene_protest, None, 8, (3, 6)),
    ("prueba-concentracion", scene_protest, None, 6, (2,)),
    ("prueba-calle", scene_street, None, 8, (3, 6)),
    ("prueba-reportaje", scene_reportage, None, 7, (1, 5)),
    ("prueba-concierto", scene_concert, "tint", 8, (3, 6)),
    ("prueba-fiesta", scene_party, "tint", 6, (2,)),
    ("prueba-boda", scene_wedding, "warm", 6, (1, 4)),
]
TINTS = [(0.85, 0.45, 0.35), (0.4, 0.5, 0.85), (0.8, 0.35, 0.6), (0.85, 0.6, 0.3)]
for si, (slug, fn, tint, n, verts) in enumerate(PLAN):
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    for i in range(n):
        rng = np.random.default_rng(5000 + 97*si + i)
        vertical = i in verts
        W, H = (1200, 1800) if vertical else (1800, 1200)
        light = (i % 3 == 1) if slug != "prueba-concentracion" else False
        img = fn(W, H, rng, light)
        if i in (2, 5) and fn is not scene_wedding: img = img.filter(ImageFilter.BoxBlur(2))
        t = None
        if tint == "tint": t = TINTS[i % 4]
        elif tint == "warm": t = (0.62, 0.55, 0.47)
        out = finish(img, rng, tint=t, vign=0.25 if fn is scene_wedding else (0.5 if light else 0.65), grain=8)
        d = ImageDraw.Draw(out); f = font(20)
        txt = "PROVISIONAL · muestra generada"
        tw = d.textlength(txt, font=f)
        lum = np.asarray(out.convert("L"))[H-60:H-15, int(W-tw-50):W-15].mean()
        d.text((W - tw - 30, H - 46), txt, font=f, fill=(30, 30, 30) if lum > 140 else (215, 215, 215))
        exif = Image.Exif(); exif[0x013B] = ARTIST; exif[0x8298] = ARTIST
        exif[0x010E] = "Imagen provisional generada por ordenador para pruebas de diseño"
        p = os.path.join(OUT, slug, f"{i+1:02d}.jpg")
        out.save(p, "JPEG", quality=80, progressive=True, optimize=True, exif=exif.tobytes())
    print(slug, n)
