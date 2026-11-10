# Álvaro Rodríguez — «A través del visor» (web 4)

Portfolio inmersivo de fotorreportaje y eventos: una intro de visor de cámara y un viaje 3D por capítulos, con la
misma historia en 2D para móviles modestos, lectores de pantalla y quien prefiera menos movimiento.

## Ver la web en tu ordenador
1. Instala Node 22 (https://nodejs.org).
2. En esta carpeta: `npm install` y después `npm run dev`.
3. Abre la dirección que aparece (normalmente http://localhost:4321).
   - Para probar la versión 3D en un equipo que la web considera modesto: añade `?tier=high` a la dirección.
   - Para ver la versión 2D: `?tier=none`.

## Cambiar fotos y textos
Cada capítulo es una carpeta en `src/content/fotos/` (`01-desde-arganda`, `02-la-calle`…) con sus fotos y un
`index.md`:
```yaml
n: 2                        # orden del capítulo
title: La calle             # título (title_en en inglés)
kicker: Capítulo 02 — La calle
text: Texto en primera persona (text_en en inglés)
photos:
  - file: ./01.jpg
    alt: Qué se ve en la foto (para personas ciegas)
    alt_en: ...
    caption: Qué pasa y quién aparece      # el lugar, la fecha y el crédito los añade la web
    caption_en: ...
    place: Madrid
    date: 2026-03-14
    featured: true          # sale en «Para editores» (unas 15 en total)
```
- **Añadir una foto:** cópiala a la carpeta del capítulo y añade su bloque en `index.md`.
- **Nuevo capítulo:** copia una carpeta, cambia `n`, títulos y fotos.
- Después: `npm run photos:check` (revisa pies, alt, tamaño y autor en EXIF, y calcula el color dominante).
- Si falta un pie o un alt, la web **no se publica**: es a propósito.
- Tus datos (email, teléfono, PDF) están en `src/i18n/strings.ts`. Si añades un PDF en `public/docs/`, pon su ruta en
  `portfolioPdf` y aparecerá el botón de descarga.
- Las fuentes se generan con `python3 scripts/make-fonts.py` (solo si cambias de tipografía).

## Comprobar antes de publicar
`npm run build`, luego `npm run check:js` (peso del JavaScript) y `CHROME_PATH=/ruta/a/chrome npm run check:lh`
(Lighthouse en móvil).

## Publicar en Cloudflare Pages (gratis)
1. Sube esta carpeta a un repositorio de GitHub.
2. En Cloudflare: Workers & Pages → Create → Pages → Connect to Git → elige el repositorio.
3. Build command `npm run build` · Output directory `dist` · Variables: `NODE_VERSION=22`,
   `SITE_URL=https://tu-dominio` (cuando lo tengas).
4. Cada `git push` publica la web; cada rama tiene su vista previa.
5. Dominio propio: Pages → Custom domains → añade el dominio (HTTPS automático). Cambia también la URL de
   `public/robots.txt`.

Alternativa sin GitHub: `npm run build` y arrastra la carpeta `dist` en Cloudflare Pages → Upload assets.

## Pendiente (TODO visible en la web)
Fotos reales y sus pies · textos de los capítulos · bio de 60–90 palabras · cámara y objetivos (opcional) · PDF de
portfolio y CV · dominio. Las 49 fotos actuales son de muestra generadas y están marcadas como PROVISIONAL.
Nota: al optimizar, Astro elimina EXIF/IPTC de las copias web; el crédito va en los pies y en los datos estructurados.
