# Archivo de Álvaro Rodríguez Valverde (web 3, portfolio completo)

Web estática con todo su trabajo, ordenado por apartados: Actualidad, Calle, Reportaje, Directo, Eventos y Bodas. La portada es una «mesa de luz» que se recorre arrastrando. Está hecha con Astro y se publica gratis en Cloudflare Pages. No necesita servidor ni base de datos: las fotos y los textos viven en esta carpeta.

El diseño y las decisiones técnicas están explicados en [`docs/PLAN.md`](docs/PLAN.md).

---

## 1. Ver la web en tu ordenador

Necesitas [Node.js](https://nodejs.org/) 22 o superior (descarga la versión "LTS" e instálala).

Abre una terminal en esta carpeta y escribe:

```bash
npm install      # solo la primera vez (descarga lo necesario)
npm run dev      # arranca la web en local
```

Abre en el navegador la dirección que aparece (normalmente `http://localhost:4321`). Cada vez que guardes un cambio, la página se actualiza sola. Para pararla: `Ctrl + C`.

---

## 2. Añadir una serie nueva

Cada serie (reportaje) es una carpeta dentro de `src/content/series/`.

1. Crea una carpeta con un nombre corto, sin espacios ni tildes. Ese nombre será la dirección de la serie. Ejemplo: `src/content/series/huelga-metro/` → `tuweb.com/series/huelga-metro`.
2. Copia dentro las fotos en JPG (las originales en alta; la web las optimiza sola). Nómbralas `01.jpg`, `02.jpg`… en el orden de la serie. Lado largo de 4000 px como máximo.
3. Crea dentro un archivo `index.md` con esta estructura (copia y cambia los textos):

```yaml
---
title: "Huelga de Metro en Sol"
title_en: "Metro strike at Sol"
section: actualidad        # actualidad | calle | reportaje | directo | eventos | bodas
place: "Madrid"
date: 2026-03-14
summary: "Texto corto de la serie: qué pasó, dónde y por qué importa. Dos o tres frases."
summary_en: "Short text about the story, in English."
cover: "./01.jpg"          # foto de portada de la serie
order: 4                   # orden dentro del apartado (1 = primera)
photos:
  - file: "./01.jpg"
    caption: "Trabajadores de Metro de Madrid cortan la entrada de la estación de Sol durante la segunda jornada de huelga."
    caption_en: "Madrid Metro workers block the entrance to Sol station on the second day of the strike."
    date: 2026-03-14
    place: "Madrid"
    featured: true         # true = sello «Prensa» en la mesa y sale en /editores (solo actualidad, calle y reportaje)
    alt: "Un grupo de personas con chalecos y pancartas delante de la boca de metro de Sol."
    alt_en: "A group of people in vests holding banners in front of the Sol metro entrance."
  - file: "./02.jpg"
    caption: "…"
    caption_en: "…"
    date: 2026-03-14
    place: "Madrid"
    featured: false
    alt: "…"
    alt_en: "…"
---
```

Reglas que la web comprueba sola (si falta algo, `npm run build` falla y te dice qué):

- **Todas** las fotos necesitan `caption` y `alt` en español e inglés.
- `caption` es el pie de agencia: **qué pasa, quién, dónde, cuándo**. La web añade sola el lugar, la fecha y el crédito: `MADRID, 14/03/2026 — Tu texto. (FOTO: Álvaro Rodríguez)`.
- `alt` describe lo que **se ve** en la imagen (para personas ciegas y para Google). Nunca "foto 1".
- Las fechas van en formato `AAAA-MM-DD`.

Para quitar las series de prueba, borra las carpetas que empiezan por `prueba-` (hay siete, una o dos por apartado).

El orden de la web es siempre Actualidad → Calle → Reportaje → Directo → Eventos → Bodas: lo de prensa sale primero en la mesa y en el centro.

---

## 3. Cambiar un pie de foto

Abre el `index.md` de la serie, busca la foto por su `file:` y cambia el texto de `caption` (y `caption_en`). Guarda. Si la web está en marcha con `npm run dev`, lo verás al momento.

---

## 4. Comprobar las fotos

```bash
npm run photos:check
```

Avisa de fotos sin pie, sin `alt`, de más de 4000 px o sin autor en los metadatos, y calcula el color dominante de cada foto.

---

## 5. Publicar

Cuando la web ya esté conectada a Cloudflare Pages (paso 6), publicar es esto:

```bash
git add .
git commit -m "Nueva serie: huelga de Metro"
git push
```

En uno o dos minutos la web está actualizada. Si el build falla (por ejemplo, porque falta un pie de foto), la versión anterior sigue en línea y Cloudflare te enseña el error.

---

## 6. Conectar Cloudflare Pages (una sola vez)

Cloudflare Pages es gratis para webs estáticas: sin límite de visitas y 500 publicaciones al mes.

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) (crea cuenta gratis si no tienes).
3. Menú **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
4. Autoriza GitHub y elige el repositorio.
5. Configuración del build:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. En **Environment variables** añade:
   - `NODE_VERSION` = `22`
   - `SITE_URL` = la dirección final de la web (al principio, la que te da Cloudflare, tipo `https://alvaro-rodriguez-archivo.pages.dev`; después, tu dominio).
7. **Save and Deploy**. En un par de minutos tendrás la web en `https://<nombre>.pages.dev`.

**Previsualizaciones por rama:** cada rama que subas a GitHub que no sea `main` genera su propia dirección de prueba (`https://<rama>.<nombre>.pages.dev`). Sirve para enseñar cambios sin tocar la web publicada. Se controla en *Settings → Builds & deployments → Preview deployments*.

### Dominio propio (opcional)

1. Compra el dominio (por ejemplo `alvarorodriguez.photo` o `.es`, unos 10–15 € al año). Puedes comprarlo en el propio Cloudflare (*Domain Registration*), que lo vende a precio de coste.
2. En el proyecto de Pages: **Custom domains** → **Set up a custom domain** → escribe el dominio y sigue los pasos. El HTTPS se activa solo.
3. Cambia la variable `SITE_URL` al nuevo dominio y la línea `Sitemap:` de `public/robots.txt`. Vuelve a publicar.

### Alternativa: GitHub Pages

Hay un flujo preparado en `.github/workflows/deploy-gh-pages.yml` (usa la acción oficial `withastro/action`). Está desactivado: en GitHub ve a *Settings → Pages → Source: GitHub Actions*, crea la variable `SITE_URL` en *Settings → Secrets and variables → Actions → Variables* y ejecútalo desde la pestaña *Actions*. Límite blando de 100 GB de tráfico al mes, de sobra para un portfolio.

---

## 7. Presupuestos de rendimiento

```bash
npm run build
npm run check:budgets   # JS inicial < 90 KB gzip, imagen de portada < 250 KB, Lighthouse ≥ 90
```

`check:js` mide el JavaScript que carga cada página (sin contar la capa WebGL, que va diferida). `check:lh` pasa Lighthouse CI sobre `dist/` con los límites de `lighthouserc.json` (LCP < 2,5 s, CLS < 0,05, TBT < 200 ms como aproximación del INP). Si algo se pasa, el comando falla.

---

## 8. Metadatos y copyright

Astro (con la librería sharp) **elimina los metadatos EXIF/IPTC** al generar las versiones optimizadas de las fotos, y no tiene opción para conservarlos. Por eso:

- Las fotos **originales** de `src/content/series/` deben llevar el autor y el copyright en sus metadatos (desde Lightroom: *Metadatos → Copyright / Creador*). `npm run photos:check` avisa si falta.
- En la web, el crédito va en cada pie de foto (`FOTO: Álvaro Rodríguez`) y en los datos estructurados (`ImageObject` con `creator`, `creditText` y `copyrightNotice`), que es lo que leen Google y las agencias.
- Sin marca de agua, a propósito.

---

## 9. Contenido pendiente (TODO)

Todo lo que falta se ve en la web como un recuadro violeta discontinuo `TODO` y en el código como comentario `TODO`.

- [ ] Fotos en alta (sustituyen a las imágenes de muestra provisionales)
- [ ] Series reales: título, lugar, fecha y texto corto de cada una (ES/EN)
- [ ] Pie de foto y `alt` de cada imagen: qué, quién, dónde, cuándo (ES/EN)
- [ ] Bio en primera persona, 60–90 palabras (y versión de 3 líneas para `/editores`)
- [x] Email (alvadar2@gmail.com) y teléfono (660 458 606) → `src/i18n/strings.ts` (`PERSON`). Sin Instagram.
- [x] Disponibilidad: prácticas desde el 16/02/2027 hasta 440 h, horario que asigne la agencia, sin convenio previo → `src/components/EditorsPage.astro`
- [ ] Portfolio en PDF y CV en PDF (todavía no existen; los botones están ocultos). Para añadirlos: copia los archivos
      a `public/docs/` y pon sus rutas en `PERSON.portfolioPdf` y `PERSON.cvPdf` de `src/i18n/strings.ts`. Los botones aparecen solos.
- [ ] Cámara y objetivos (opcional) → `src/components/AboutPage.astro`. Software, inglés B1 y movilidad ya están.
- [x] Referente: Alex Webb (Magnum) → `src/components/AboutPage.astro`
- [ ] Encargos: cómo trabaja, qué entrega y tarifas (sin inventar precios) → `src/components/CommissionsPage.astro`. Zona ya está.
- [ ] Dominio → `SITE_URL`, `astro.config.mjs` y `public/robots.txt`

---

## Estructura

```
src/content/series/<serie>/   fotos + index.md de cada reportaje
src/i18n/strings.ts           textos de la interfaz (ES/EN) y datos de contacto
src/pages/                    páginas (ES en /, EN en /en/)
src/components/               piezas de las páginas
src/scripts/                  animaciones (GSAP, Lenis) y capa WebGL
src/styles/                   colores, tipografías y estilos globales
public/                       archivos que se copian tal cual (PDF, robots.txt, favicon)
scripts/                      comprobaciones (fotos, presupuestos)
docs/PLAN.md                  concepto y sistema de diseño
```


---

## Tipografías

Newsreader (titulares) se sirve en dos cortes estáticos de 23 KB generados desde la variable de Fontsource con `python3 scripts/make-fonts.py` (requiere `pip install fonttools brotli`). Solo hace falta volver a ejecutarlo si se cambia de corte. Schibsted Grotesk (texto) viene de Fontsource.

## Capas

- Sin JavaScript: índice limpio por apartados con todas las fotos y enlaces.
- Móvil / pantallas estrechas: rejilla con filtro (GSAP Flip), tira horizontal en las series.
- Escritorio: mesa de luz infinita (arrastrar, rueda, flechas + Enter), encendido de la mesa la primera vez de cada visita, Lenis en el resto de páginas.
- Escritorio potente (WebGL2, ≥ 4 núcleos y ≥ 4 GB): fotos dibujadas con WebGL (OGL) con desenfoque hacia los bordes, revelado en las series y curvatura según la velocidad del scroll. Si el ordenador no llega a ~45 fps se apaga sola.
