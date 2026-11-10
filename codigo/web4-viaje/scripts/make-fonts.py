"""Subsetea las fuentes a Latin-1 + puntuación tipográfica. Ejecutar: python3 scripts/make-fonts.py"""
import subprocess, os
U = "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2039-203A,U+20AC,U+2122,U+2190-2193,U+2212,U+00D7"
NM = 'node_modules/@fontsource'
jobs = [
  (f'{NM}-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2', 'src/assets/fonts/bricolage-wght.woff2'),
  (f'{NM}/martian-mono/files/martian-mono-latin-400-normal.woff2', 'src/assets/fonts/martian-400.woff2'),
  (f'{NM}/martian-mono/files/martian-mono-latin-500-normal.woff2', 'src/assets/fonts/martian-500.woff2'),
]
for src, out in jobs:
    subprocess.run(['pyftsubset', src, f'--unicodes={U}', '--flavor=woff2', f'--output-file={out}',
                    '--layout-features=kern,liga,calt,tnum,case', '--no-hinting'], check=True)
    print(out, os.path.getsize(out) // 1024, 'KB')
