# ESTADO — Portfolio de Álvaro Rodríguez Valverde
_Última actualización: 10/11/2026 (chat inicial de construcción)._ Se actualiza al final de cada chat **en el repo** (commit + push a `main`), junto con los cambios de código.

## 1. Álvaro (datos confirmados)
- 20 años, vive en Arganda del Rey (Madrid). 2º del Grado Superior de Iluminación, Captación y Tratamiento de Imagen, Campus FP Atocha.
- Quiere fotoperiodismo, calle, reportaje y actualidad. También eventos, conciertos y bodas, en segundo plano. Vídeo no.
- Objetivo: prácticas (FCT) en agencias (Europa Press, EFE, Servimedia, Contacto, Getty, AFP, Reuters, AP, El País…).
- **Email:** alvadar2@gmail.com · **Teléfono:** 660 458 606
- **Prácticas:** desde el 16/02/2027 hasta completar 440 h; horario el que asigne la empresa. Acepta empresas sin convenio previo (el centro lo tramita).
- Edita con Lightroom Classic y Photoshop. Inglés B1. Sin carné de conducir; se mueve en transporte público por la Comunidad de Madrid.
- Referente: Alex Webb (Magnum); le gustan sus fotos de niños jugando en un patio en México (sin título ni año exactos).
- **No tiene:** Instagram ni web de fotos aparte, portfolio PDF, CV PDF, experiencia en manifestaciones, ruedas de prensa ni actos públicos, serie de reportaje de 6–8 fotos, fotos de temas sociales. Cámara y objetivos: sin respuesta. Bio: pendiente.
- Pies y metadatos de autor en sus fotos: «depende».
- **Retrato real:** foto cuadrada, fondo gris (archivo `_OMB0014.jpg`), ya integrada en la web 2.

## 2. Fotos reales (carpeta del PC de Marlon)
`C:\Users\USUARIO\Desktop\FIESTAS Y MÚSICA\` (conectada a la app de escritorio)
- `LA FIESTA NARANJA/`: 22 JPG (5–27 MB). Según el nombre de archivo, 07 y 08/06/2025. Varios «-Mejorado-NR».
- `SUPERNOVENTEROS/`: 16 JPG (7–20 MB).
- `MÁS TRABAJOS/`: 15 JPG/JPEG (4–22 MB), mezcla de eventos.
- **Pendiente de Marlon/Álvaro:** lugar y fecha de Fiesta Naranja y Supernoventeros, y qué es cada foto de Más trabajos (para los pies).

**Repositorio:** https://github.com/Javimati/proyecto-paraguayo · código en `codigo/web1-fotoperiodismo`, `codigo/web2-directo`, `codigo/web3-portfolio`, `codigo/web4-viaje`.

## 3. Las 4 webs (todas: Astro 7 estático, ES/EN, capas de mejora progresiva, Cloudflare Pages)
| # | Carpeta (en el chat inicial) | Concepto | Prototipo en Claude |
|---|---|---|---|
| 1 | `alvaro-web` | Fotoperiodismo: hoja de contactos + teletipo de agencia, lápiz graso rojo, revelado WebGL (OGL). Big Shoulders + IBM Plex Mono | https://claude.ai/artifact/5ZzUnzH97mDDeESQZVXatZ (slug 24ffc730-c64c-4309-b570-6551f23da502) |
| 2 | `alvaro-directo` | **Directo/eventos: setlist con cinta americana**, luz de escenario (OGL) fuera de la foto. Permanent Marker + Archivo | https://claude.ai/artifact/XF2J1oP8y7nnY43bg3fnBE (slug f4e75ea0-09c0-47bb-bb5d-ee5dbc7f0795) |
| 3 | `alvaro-archivo` | Portfolio global: mesa de luz infinita con cuentahílos, filtros por apartado. Newsreader + Schibsted Grotesk | https://claude.ai/artifact/RxBFxBmVxHCzCywXVsahKD (slug ca0f8e88-b9f7-4207-bd91-494176ce8008) |
| 4 | `alvaro-viaje` | «A través del visor»: intro de visor de cámara (mantén para enfocar), viaje 3D Three.js por 6 estaciones, final con hoja de contactos. Bricolage Grotesque + Martian Mono, acento #ffe14d | https://claude.ai/artifact/8wpoRMP9kGTApD9hAHhjz9 (slug 4057979a-e935-4705-b6a5-112e324de2ba) |

Datos reales metidos en las 4 webs (email, teléfono, prácticas, software, inglés, movilidad, Alex Webb). Instagram quitado y botones de PDF ocultos mientras no haya archivo. Fotos: **todas de muestra generadas (PROVISIONAL)**, salvo el retrato de la web 2.

## 4. PRIORIDAD ACTUAL → Web 2 (setlist)
- Ya tiene solo 3 secciones, en orden fijo: **Fiesta Naranja** (`fiesta-naranja`), **Supernoventeros** (`supernoventeros`) y **Más trabajos** (`mas-trabajos`; EN «More work»). Rutas `/eventos/<slug>/` y `/en/events/<slug>/`.
- Lugar y fecha opcionales: se muestran «pendiente» si faltan. Más trabajos = «Varios lugares · Varias fechas», con lugar y fecha por foto.
- Retrato en /sobre (polaroid con cinta), miniatura en /para-promotores, JSON-LD y og:image.
- **Siguiente paso:** importar las fotos reales con el importador (reduce a 3000 px, conserva EXIF/IPTC, ordena por fecha EXIF y pone las fechas):
  ```
  npm run photos:import -- "<carpeta>" fiesta-naranja --select 4
  npm run photos:import -- "<carpeta>" supernoventeros --select 4
  npm run photos:import -- "<carpeta>" mas-trabajos --select 3
  ```
  Las fotos se pasan del PC al chat con `device_stage_files` (máx. 50 archivos, 400 MB/archivo y 500 MB por llamada). Después: elegir 6–10 por sección (no meter las 53), escribir pies y alt reales (con los datos que dé Marlon), build, comprobaciones, reempaquetar y republicar en el mismo slug.
- Pendientes de la web 2: tarifas, plazo de entrega y bio (TODO).

## 5. Publicar un prototipo en Claude (lo que funcionó)
Restricciones del visor de artefactos: rutas relativas, fuentes como data: URI, sin descargas, máx. 256 archivos por publicación y **ningún nombre de archivo o carpeta que empiece por `_`**.
Herramientas en `herramientas/` del repo:
1. `node tools/package-site.mjs <carpeta-web> <nombre>` → `entregables/<nombre>/preview/` + zips de subida directa y de repositorio. Quita el router de Astro, incrusta las fuentes y deja 2 tamaños de imagen.
2. `python3 tools/fix-underscore.py entregables/<nombre>` → renombra `_astro` a `x_astro`.
3. Webs 2 y 3: `unify-loupe.py`, luego `one-per-photo.py <dir> 1200` y `reduce-preview.py <dir> 1200` → una imagen por foto (si no, más de 256 archivos).
4. `font-display:optional` → `swap` en el preview (si no, en el visor no carga la Permanent Marker).
5. Web 4: reescribir las rutas del JSON `"/x_astro/` → `"./x_astro/` (o `../` en `/en/`).
6. Probar en local (http.server + Playwright) y publicar con `publish_files` (mismo slug, `base_version` de `get_artifact`, mode replace o patch).

## 6. Despliegue en Cloudflare
- **Opción A, subida directa:** arrastrar `webN-*-cloudflare-subida-directa.zip` en Workers & Pages → Pages → Upload assets. Un proyecto creado así no se puede pasar luego a GitHub.
- **Opción B (recomendada):** este repo conectado a Pages (un proyecto de Pages por web, con directorio raíz `codigo/webN-…`), build `npm run build`, salida `dist`, `NODE_VERSION=22`, `SITE_URL=<dominio>`.
- Dominio: pendiente. Cuando lo haya, cambiar `SITE_URL` y `robots.txt`. Guía completa: `LEEME-DESPLIEGUE.md`.

## 7. Problemas conocidos
- **WebGL solo probado con renderizado por software:** fps reales sin medir en una GPU.
- **Web 4:**
  - Auditoría de accesibilidad y rendimiento sin repetir tras el rediseño.
  - La ventana del cuarto de Arganda se ve como un rectángulo claro desde una parada.
  - En móvil no se ha recapturado tras el último ajuste.
  - El título 3D «Desde Arganda» ya está arreglado (las paredes lo tapaban).
- **Web 3:** al filtrar, 8 fotos quedan a unos 245 px (se quería 400).
- **Web 2:** en móvil, en /para-promotores la primera foto queda bajo el primer pantallazo.
- **Builds lentos** la primera vez por AVIF (web 1: 11 min). Los siguientes usan caché.

## 8. Decisiones tomadas (no reabrir)
- Presupuestos: LCP < 2,5 s, CLS < 0,05, INP < 200 ms, JS inicial < 90 KB gzip (web 4: escena 3D diferida < 350 KB), Lighthouse ≥ 90.
- Un único sistema de animación por web. Lenis solo en escritorio. Sin ScrollTrigger si no se usa.
- Sin marca de agua. Crédito en pies y JSON-LD; Astro quita el EXIF de las imágenes optimizadas.
- Las fotos en WebGL se pintan sin iluminación, sin tone mapping ni grano.
