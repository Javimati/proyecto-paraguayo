# Álvaro Rodríguez — Directo

Web estática de fotografía de **directo**: conciertos, festivales, salas, fiestas y eventos. Está hecha con Astro y se publica gratis en Cloudflare Pages. No necesita servidor ni base de datos: las fotos y los textos están en esta carpeta.

El concepto, el diseño y las decisiones técnicas están en [`docs/PLAN.md`](docs/PLAN.md).

> Todo lo que pone **PROVISIONAL** o **TODO** en la web está pendiente: las fotos actuales son imágenes de muestra generadas, no son de Álvaro.

---

## 1. Ver la web en tu ordenador

Necesitas [Node.js](https://nodejs.org/) 22 o superior (la versión «LTS»).

Abre una terminal en esta carpeta y escribe:

```bash
npm install      # solo la primera vez
npm run dev      # arranca la web en local
```

Abre la dirección que aparece (normalmente `http://localhost:4321`). Cada vez que guardes un cambio, la página se actualiza sola. Para pararla, pulsa `Ctrl + C`.

---

## 2. Añadir un evento nuevo

Cada evento (un concierto, un festival, una fiesta…) es una carpeta dentro de `src/content/eventos/`.

1. Crea una carpeta con un nombre corto, sin espacios ni tildes. Ese nombre será la dirección del evento. Ejemplo: `src/content/eventos/sala-x-marzo/` → `tuweb.com/eventos/sala-x-marzo`.
2. Copia dentro las fotos en JPG (las originales en alta: la web las optimiza sola), con los nombres `01.jpg`, `02.jpg`… en el orden de la galería. Lado largo de 4000 px como máximo.
3. Crea dentro un archivo `index.md` como este (copia y cambia los textos):

```yaml
---
title: "Nombre del artista o del evento"
title_en: "Artist or event name"
kind: concierto            # concierto | festival | fiesta | evento | boda
venue: "Sala X"
city: "Madrid"
date: 2026-03-14
time: "22:30"              # opcional
summary: "Dos o tres frases secas: quién, dónde, qué tuvo la noche."
summary_en: "The same in English."
cover: ./02.jpg            # la foto que sale en el setlist
order: 5                   # posición en el setlist (1 = arriba)
photos:
  - file: ./01.jpg
    caption: "Qué pasa en la foto, quién sale, qué canción o momento."
    caption_en: "The same in English."
    selected: true         # true = sale también en «Para promotores»
    alt: "Descripción de lo que se ve, para quien no puede ver la foto."
    alt_en: "Description in English."
  - file: ./02.jpg
    caption: "…"
    caption_en: "…"
    selected: false
    alt: "…"
    alt_en: "…"
---
```

El pie se publica con formato de crónica: `SALA X, MADRID, 14/03/2026 — tu texto (FOTO: Álvaro Rodríguez)`. El lugar, la fecha y el crédito los pone la web: tú escribe solo el texto.

**Si falta un pie o un `alt`, la web no se publica** (es a propósito: así nunca sale una foto sin pie).

La web tiene tres secciones: `fiesta-naranja`, `supernoventeros` y `mas-trabajos` (orden fijo con el campo `order`). Sala, ciudad y fecha son opcionales: si faltan, la web muestra «pendiente». En `mas-trabajos` (`mixed: true`) cada foto lleva su propio `venue`/`city`/`date`.

### Importar las fotos reales (un comando por sección)

```bash
npm run photos:import -- "C:/ruta/a/FIESTAS Y MÚSICA/Fiesta Naranja" fiesta-naranja --select 4
npm run photos:import -- "C:/ruta/a/FIESTAS Y MÚSICA/Supernoventeros" supernoventeros --select 4
npm run photos:import -- "C:/ruta/a/FIESTAS Y MÚSICA/Otros" mas-trabajos --select 3
```

Copia JPG/PNG/WEBP/TIFF/HEIC de la carpeta (sin subcarpetas), las ordena por fecha EXIF (o por nombre), las reduce a 3000 px conservando EXIF/IPTC, las renombra 01.jpg… y reescribe la lista de fotos del `index.md` manteniendo título y textos. `--select N` marca las N primeras para /para-promotores; `--append` añade en vez de sustituir. Pies y alt quedan como `TODO: …`: compilan, y `npm run photos:check` los lista como pendientes hasta que los rellenes.

## 3. Cambiar un pie de foto

Abre el `index.md` del evento, busca la foto (`file: ./05.jpg`) y cambia `caption` (español) y `caption_en` (inglés). Guarda y publica (punto 5).

## 4. Comprobar las fotos

```bash
npm run photos:check
```

Avisa de fotos sin pie o sin `alt`, de las de más de 4000 px, de las que no tienen autor en los metadatos (EXIF) y de las que están en la carpeta pero no en el `index.md`. También calcula el color de cada foto, que la web usa para la «luz de gel» de cada show (`src/data/palettes.json`). **Ejecútalo cada vez que añadas fotos.**

## 5. Publicar

Cuando la web está conectada a Cloudflare Pages (punto 6), publicar es guardar los cambios en GitHub:

```bash
git add .
git commit -m "Nuevo evento: Sala X"
git push
```

En un par de minutos la web está actualizada. Si algo falla (por ejemplo, un pie que falta), Cloudflare no publica y la versión anterior sigue en línea.

## 6. Conectar Cloudflare Pages (una sola vez)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Elige el repositorio y configura:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Variables de entorno:** `NODE_VERSION` = `22` y `SITE_URL` = la dirección final (por ejemplo `https://alvaro-directo.pages.dev`, o el dominio propio cuando lo haya).
4. **Save and Deploy.** La web queda en `https://<nombre-del-proyecto>.pages.dev`.

**Previsualizaciones:** cada rama que no sea la principal se publica en su propia dirección (`https://<rama>.<proyecto>.pages.dev`), útil para enseñar cambios antes de publicarlos.

**Subida directa sin GitHub:** en Pages → **Create** → **Upload assets**, arrastra la carpeta `dist` que genera `npm run build`. Sirve para probar, pero cada cambio exige volver a subirla.

El archivo `public/_headers` ya configura la caché larga de las imágenes y algunas cabeceras de seguridad.

### Dominio propio

En el proyecto de Pages → **Custom domains** → **Set up a domain**. Si el dominio está en Cloudflare se configura solo; si no, Cloudflare dice qué registro DNS añadir. El HTTPS es automático. Después cambia `SITE_URL` y la línea `Sitemap:` de `public/robots.txt`. **TODO: dominio.**

### Alternativa: GitHub Pages

`.github/workflows/deploy-gh-pages.yml` publica con la acción oficial de Astro. Está desactivado (solo se lanza a mano desde la pestaña **Actions**). Activa Pages en el repositorio (Settings → Pages → Source: GitHub Actions).

## 7. Datos de contacto y PDF

- Email (alvadar2@gmail.com) y teléfono (660 458 606): `src/i18n/strings.ts`, objeto `PERSON`. No hay Instagram.
- PDF del portfolio y CV: todavía no existen y sus botones están ocultos. Para añadirlos, copia los archivos a `public/docs/`
  y pon sus rutas en `PERSON.portfolioPdf` y `PERSON.cvPdf` (p. ej. `'/docs/portfolio-directo-alvaro-rodriguez.pdf'`). Los botones aparecen solos.

## 8. Metadatos de autor (EXIF/IPTC)

Al optimizar, Astro (sharp) **quita los metadatos** de las fotos que sirve. El crédito queda en el pie, en los datos estructurados de cada página (`creditText`, `copyrightNotice`) y en tus originales, que siguen en esta carpeta con su EXIF. No hay marca de agua.

## 9. Presupuestos de calidad

```bash
npm run build
npm run check:budgets   # JS inicial < 90 KB gzip, imagen de portada < 250 KB y Lighthouse móvil
```

`check:lh` necesita Google Chrome instalado (variable `CHROME_PATH` si no está en el sitio de siempre).

**Pesos medidos (noviembre 2026, con las fotos de muestra):**

| | gzip |
|---|---|
| JS inicial de cada página | ≈ 9 KB (1,5 KB en «Para promotores») |
| Escritorio: GSAP + ScrollTrigger + SplitText + Lenis (`import()`) | ≈ 53 KB |
| Capa WebGL, OGL + shaders (`import()` tras el LCP) | ≈ 18 KB |
| Fuentes: Archivo variable (latín) + Permanent Marker | ≈ 88 KB + 29 KB |

Lighthouse móvil simulado: home 98/100/100/100, evento 97/100/100/100, promotores 99/100/100/100.

**El primer build tarda unos 8 minutos** (genera AVIF y WebP de todas las fotos). Los siguientes reutilizan la caché y tardan segundos.

## 10. Pendiente de contenido (TODO)

- [ ] Fotos reales de Álvaro en las tres secciones (`npm run photos:import`)
- [ ] Eventos reales: artista o evento, sala, ciudad, fecha, hora y texto corto
- [ ] Pie de foto de cada imagen (quién, qué canción o momento, dónde, cuándo)
- [ ] Bio en primera persona, 60–90 palabras (`src/components/AboutPage.astro`)
- [ ] Email, teléfono, Instagram (`src/i18n/strings.ts`)
- [ ] Disponibilidad, tarifas (o «a consultar») y plazo de entrega (`src/components/PromotersPage.astro`)
- [ ] PDF del portfolio de directo y CV
- [ ] Equipo y fotógrafos de referencia (opcional)
- [ ] Dominio
