# ESTADO — Portfolio de Álvaro Rodríguez Valverde
_Última actualización: 10/11/2026 (chat 3: webs 2 y 4 publicadas en Cloudflare Pages desde GitHub)._ Se actualiza al final de cada chat **en el repo** (commit + push a `main`), junto con los cambios de código.

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
- **Fechas según EXIF:** Fiesta Naranja 07–08/06/2025; Supernoventeros 29–30/03/2025; Más trabajos: 11/05/2025 (2 fotos), 06/09/2025 (3), 22/08/2026 (2) y una sin EXIF (`SAVE_20251001_220145.jpg`).
- **Pendiente de Marlon/Álvaro:** lugar de Fiesta Naranja y Supernoventeros, confirmar las fechas, y qué es cada foto de Más trabajos (lugar, evento, quién sale) para los pies.

**Repositorio:** https://github.com/Javimati/proyecto-paraguayo · código en `codigo/web1-fotoperiodismo`, `codigo/web2-directo`, `codigo/web3-portfolio`, `codigo/web4-viaje`.

## 3. Las 4 webs (todas: Astro 7 estático, ES/EN, capas de mejora progresiva, Cloudflare Pages)
| # | Carpeta (en el chat inicial) | Concepto | Prototipo en Claude |
|---|---|---|---|
| 1 | `alvaro-web` | Fotoperiodismo: hoja de contactos + teletipo de agencia, lápiz graso rojo, revelado WebGL (OGL). Big Shoulders + IBM Plex Mono | https://claude.ai/artifact/5ZzUnzH97mDDeESQZVXatZ (slug 24ffc730-c64c-4309-b570-6551f23da502) |
| 2 | `alvaro-directo` | **Directo/eventos: setlist con cinta americana**, luz de escenario (OGL) fuera de la foto. Permanent Marker + Archivo | https://claude.ai/artifact/XF2J1oP8y7nnY43bg3fnBE (slug f4e75ea0-09c0-47bb-bb5d-ee5dbc7f0795) |
| 3 | `alvaro-archivo` | Portfolio global: mesa de luz infinita con cuentahílos, filtros por apartado. Newsreader + Schibsted Grotesk | https://claude.ai/artifact/RxBFxBmVxHCzCywXVsahKD (slug ca0f8e88-b9f7-4207-bd91-494176ce8008) |
| 4 | `alvaro-viaje` | «A través del visor»: intro de visor de cámara (mantén para enfocar), viaje 3D Three.js por 6 estaciones, final con hoja de contactos. Bricolage Grotesque + Martian Mono, acento #ffe14d | https://claude.ai/artifact/8wpoRMP9kGTApD9hAHhjz9 (slug 4057979a-e935-4705-b6a5-112e324de2ba) |

Datos reales metidos en las 4 webs (email, teléfono, prácticas, software, inglés, movilidad, Alex Webb). Instagram quitado y botones de PDF ocultos mientras no haya archivo. Fotos: de muestra generadas (PROVISIONAL) en las webs 1, 3 y 4. **La web 2 ya tiene las fotos reales** (10/11/2026).

## 4. PRIORIDAD ACTUAL → Web 2 (setlist)
- Ya tiene solo 3 secciones, en orden fijo: **Fiesta Naranja** (`fiesta-naranja`), **Supernoventeros** (`supernoventeros`) y **Más trabajos** (`mas-trabajos`; EN «More work»). Rutas `/eventos/<slug>/` y `/en/events/<slug>/`.
- Lugar y fecha opcionales: se muestran «pendiente» si faltan. Más trabajos = «Varios lugares · Varias fechas», con lugar y fecha por foto.
- Retrato en /sobre (polaroid con cinta), miniatura en /para-promotores, JSON-LD y og:image.
- **Hecho (10/11/2026): fotos reales importadas** con `photos:import` (3000 px, EXIF conservado). Selección: Fiesta Naranja 10 de 22, Supernoventeros 8 de 16, Más trabajos 8 de 15. Descartadas a propósito: `07062025-DSC02979` (casi negra) y `KC PARED 2 (V2) (1)` (póster de desnudo al fondo).
  - Fiesta Naranja (orden de galería = cronológico por nº DSC): 01=DSC02591, 02=DSC02658, 03=DSC02735, 07=DSC02931 (**portada**), 08=DSC03108, 04=DSC03171, 09=DSC03200, 10=DSC03499, 05=DSC03587, 06=DSC03747. Destacadas: 07, 10, 04, 05.
  - Supernoventeros: 01=DSC02138, 02=DSC02202 (**portada**), 03=DSC02260, 04=DSC02282, 05=DSC02378, 06=DSC02684, 07=DSC02754, 08=DSC02780. Destacadas: 01, 02, 04, 06.
  - Más trabajos: 01=DSC09914, 02=DSC00851 (**portada**), 03=DSC00963, 04=DSC00978, 05=DSC01014, 06=_R006961, 07=_R006980, 08=SAVE_20251001_220145. Destacadas: 01, 02, 06.
  - Pies y alt: **descriptivos de lo que se ve** (sin nombres, artistas ni lugares). Sustituir cuando Álvaro diga quién sale y el momento. Resúmenes de sección siguen como TODO visible.
  - Fecha de sección = primer día según EXIF (comentado en cada `index.md` como «confirmar»). Lugar: «pendiente».
  - Rendimiento: la primera foto de evento y de /para-promotores sale con calidad 62 (y ancho 640 añadido); en /para-promotores solo la primera es `eager`. Lighthouse móvil: home P99, evento P98 (LCP 2,41 s), promotores P99 (LCP 1,05 s), /en/ P98. `photos:check` sin errores (avisos: sin autor/copyright en EXIF). `check:js` ok.
  - Prototipo republicado en el mismo slug (versión `1794337265-4348`, 48 archivos).
- **Siguiente paso web 2:** pies reales, lugares, resúmenes, bio, tarifas y plazo de entrega (datos de Álvaro).
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
- **Formato definitivo (10/11/2026): este repo conectado a Cloudflare Pages, plan gratuito.** Cada push a `main` publica solo. Cuenta de Cloudflare de Marlon (marlonjavimati2). **Solo se publican 2 webs:**
  | Proyecto de Pages | Web | Directorio raíz | Watch path | URL |
  |---|---|---|---|---|
  | `alvarorodriguezeventos` | 2 (directo) | `codigo/web2-directo` | `codigo/web2-directo/*` | https://alvarorodriguezeventos.pages.dev |
  | `alvarorodriguezportfolio` | 4 (viaje) | `codigo/web4-viaje` | `codigo/web4-viaje/*` | https://alvarorodriguezportfolio.pages.dev |
- Los dos: build `npm run build`, salida `dist`, variables `NODE_VERSION=22` y `SITE_URL=<su URL .pages.dev>`. Rama de producción `main`; las demás ramas generan previsualizaciones.
- Comprobado el 10/11/2026: las dos URLs cargan; eventos ya muestra el commit `40eb592` (fotos reales).
- Límites del plan gratuito: 500 builds/mes y 1 build a la vez (por cuenta); tráfico ilimitado. Con los watch paths, un push solo reconstruye la web cuya carpeta cambió.
- **Caché de build activada** en los dos proyectos (10/11/2026): reutiliza dependencias e imágenes ya optimizadas; no cambia la calidad. Si algún día una foto no se actualiza tras cambiarla, usar *Settings → Build cache → Clear Cache*.
- Comprobado: un push que no toca la carpeta de una web aparece en Cloudflare como «No deployment available» (build omitido, no gasta).
- Confirmado por Marlon (10/11/2026): el portfolio publicado es la **web 4** (visor «A través del visor»), aunque la carpeta `web3-portfolio` se llame así; los eventos son la **web 2**. Las webs 1 y 3 no se publican.
- Dominio propio: pendiente. Cuando lo haya: Custom domains en el proyecto, cambiar `SITE_URL` y la línea `Sitemap:` de `public/robots.txt`. Guía: `LEEME-DESPLIEGUE.md`.

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
