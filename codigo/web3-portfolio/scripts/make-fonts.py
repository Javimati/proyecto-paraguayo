# Genera los cortes estáticos de Newsreader (display opsz 60 y texto opsz 14, peso 400) a partir
# de la variable de Fontsource: 23 KB cada uno frente a 132 KB de la variable completa.
# Uso: pip install fonttools brotli && python3 scripts/make-fonts.py
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
SRC = 'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2'
for opsz, name in [(60, 'display'), (14, 'text')]:
    f = TTFont(SRC)
    inst = instancer.instantiateVariableFont(f, {'opsz': opsz, 'wght': 400})
    inst.flavor = 'woff2'
    inst.save(f'src/assets/fonts/newsreader-{name}-400.woff2')
