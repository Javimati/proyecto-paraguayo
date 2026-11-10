#!/usr/bin/env python3
"""
preview-fotos.py — adapta las fotos nativas (/fotos/…) de un preview para el visor de artefactos de Claude.

  python3 herramientas/preview-fotos.py <preview_dir> <dist_dir> [max_px=2400]

El visor admite 256 archivos y 64 MB por publicación y necesita rutas relativas. Por cada foto se suben dos
versiones (la menor y la mayor ≤ max_px, que puede ser el original) y se reescriben TODAS las referencias
(atributos src/srcset/imagesrcset, el JSON del viaje: src, srcSmall, srcset, variants, original) a rutas
relativas que existen. La web real (Cloudflare) sigue teniendo todas las versiones.
"""
import json, os, re, shutil, sys
from PIL import Image

prev, dist = sys.argv[1], sys.argv[2]
MAXPX = int(sys.argv[3]) if len(sys.argv) > 3 else 2400
src_root = os.path.join(dist, 'fotos')

# versiones disponibles por foto: {(cap, nn): {ancho: nombre}}
avail = {}
for cap in sorted(os.listdir(src_root)):
    for f in os.listdir(os.path.join(src_root, cap)):
        m = re.match(r'^(\d+)-(\d+|original)\.jpg$', f)
        if not m:
            continue
        w = Image.open(os.path.join(src_root, cap, f)).width if m.group(2) == 'original' else int(m.group(2))
        avail.setdefault((cap, m.group(1)), {})[w] = f

keep = {}
for k, vs in avail.items():
    ws = sorted(vs)
    small = ws[0]
    big = max([w for w in ws if w <= MAXPX] or [small])
    keep[k] = {small: vs[small], big: vs[big]}

out_root = os.path.join(prev, 'fotos')
shutil.rmtree(out_root, ignore_errors=True)
for (cap, nn), vs in keep.items():
    os.makedirs(os.path.join(out_root, cap), exist_ok=True)
    for w, f in vs.items():
        shutil.copy2(os.path.join(src_root, cap, f), os.path.join(out_root, cap, f))

URL = re.compile(r'/fotos/([^/"\s,]+)/(\d+)-(\d+|original)\.jpg')

def best(cap, nn, w):
    vs = keep[(cap, nn)]
    ws = sorted(vs)
    cand = [x for x in ws if x >= w]
    return (cand[0] if cand else ws[-1]), vs

for dp, _, fns in os.walk(prev):
    for fn in fns:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dp, fn)
        depth = os.path.relpath(p, prev).count(os.sep)
        pre = './' if depth == 0 else '../' * depth
        s = open(p, encoding='utf-8').read()

        def rel(cap, f):
            return f'{pre}fotos/{cap}/{f}'

        # 1) listas srcset («url 640w, url 800w, …») → solo las versiones subidas
        def fix_list(m):
            items = [x.strip() for x in m.group(0).split(',')]
            first = URL.search(items[0])
            cap, nn = first.group(1), first.group(2)
            vs = keep[(cap, nn)]
            return ', '.join(f'{rel(cap, vs[w])} {w}w' for w in sorted(vs))
        s = re.sub(r'(?:[./]*/?fotos/[^/"\s,]+/\d+-(?:\d+|original)\.jpg \d+w)(?:,\s*[./]*/?fotos/[^/"\s,]+/\d+-(?:\d+|original)\.jpg \d+w)*', fix_list, s)

        # 2) JSON del viaje: variants [[w,"url"],…]
        def fix_variants(m):
            arr = json.loads(m.group(1))
            if not arr:
                return m.group(0)
            u = URL.search(arr[0][1])
            cap, nn = u.group(1), u.group(2)
            vs = keep[(cap, nn)]
            return '"variants":' + json.dumps([[w, rel(cap, vs[w])] for w in sorted(vs)], separators=(',', ':'))
        s = re.sub(r'"variants":(\[\[[^\]]*\](?:,\[[^\]]*\])*\])', fix_variants, s)

        # 3) URLs sueltas que quedan (src, srcSmall, original…) → la versión subida más cercana por arriba
        def fix_one(m):
            cap, nn, w = m.group(1), m.group(2), m.group(3)
            if w == 'original':
                ww = max(avail[(cap, nn)])
            else:
                ww = int(w)
            b, vs = best(cap, nn, ww)
            return rel(cap, vs[b])
        # (absolutas «/fotos/…» o ya relativas «./fotos/…», «../fotos/…»; no toca https://dominio/fotos/… del JSON-LD)
        s = re.sub(r'(?<![\w:/.])(?:(?:\.\.?/)+|/)fotos/([^/"\s,]+)/(\d+)-(\d+|original)\.jpg', fix_one, s)
        open(p, 'w', encoding='utf-8').write(s)

n = sum(len(v) for v in keep.values())
size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out_root) for f in fs)
print(f'preview-fotos: {len(keep)} fotos, {n} archivos, {size / 1048576:.1f} MB (máx. {MAXPX} px por foto)')
