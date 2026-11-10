# ESTADO — Portfolio de Álvaro Rodríguez Valverde
_Última actualización: 10/11/2026 (chat 4: web 4 «la calle de los recuerdos»; chat 3: webs 2 y 4 en Cloudflare Pages; chat 2: fotos reales y peticiones de Álvaro en la web 2)._ Se actualiza al final de cada chat **en el repo** (commit + push a `main`), junto con los cambios de código.
## 1. Álvaro (datos confirmados)
- 20 años, vive en Arganda del Rey (Madrid). 2º del Grado Superior de Iluminación, Captación y Tratamiento de Imagen, Campus FP Atocha. Antes: **Grado Medio de Técnico en Vídeo Disc-jockey y Sonido, Campus FP Arganda** (dato de Marlon, 10/11/2026; puesto en /sobre de la web 2).
- Quiere fotoperiodismo, calle, reportaje y actualidad. También eventos, conciertos y bodas, en segundo plano. Vídeo no.
- Objetivo: prácticas (FCT) en agencias (Europa Press, EFE, Servimedia, Contacto, Getty, AFP, Reuters, AP, El País…).
- **Email:** alvadar2@gmail.com · **Teléfono:** 660 458 606
- **Prácticas:** desde el 16/02/2027 hasta completar 440 h; horario el que asigne la empresa. Acepta empresas sin convenio previo (el centro lo tramita).
- Edita con Lightroom Classic y Photoshop. Inglés B1. Sin carné de conducir; se mueve en transporte público por la Comunidad de Madrid.
- Referente: Alex Webb (Magnum); le gustan sus fotos de niños jugando en un patio en México (sin título ni año exactos).
- **No tiene:** Instagram ni web de fotos aparte, portfolio PDF, CV PDF, experiencia en manifestaciones, ruedas de prensa ni actos públicos, serie de reportaje de 6–8 fotos, fotos de temas sociales. Cámara y objetivos: sin respuesta.
- **Bio (dada por Álvaro, 10/11/2026, reescrita más cercana en la web 2):** estudiante del Grado Superior de Técnico en Iluminación, Captación y Tratamiento de la Imagen; le apasiona la fotografía de eventos; le encanta capturar momentos que pasan en un segundo y se recuerdan siempre (energía de un directo, emoción en una celebración, detalles que casi nadie ve); su formación en iluminación y postproducción le permite trabajar con cualquier luz (salas oscuras, exteriores) y entregar imágenes cuidadas con acabado profesional; está construyendo su trayectoria y busca colaborar en conciertos, fiestas y eventos («Si quieres que tu evento quede bien contado, escríbeme»).
- **Preferencias de Álvaro (no reabrir):** sus fotos **nunca recortadas** (siempre enteras, sin `object-fit: cover`), **todas las fotos de la carpeta** (sin descartes), **sin fechas visibles**, y **máxima calidad** de imagen.
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

## 3b. Web 4 — «La calle de los recuerdos» (10/11/2026, versión publicada 1794340257-c416)
El vacío oscuro entre estaciones es ahora una **calle de Madrid de noche** (`src/experience/street.ts`):
- Edificios procedurales a ambos lados del recorrido (ventanas encendidas que cambian despacio, teles, balcones, persianas, locales abiertos, algún neón), aceras de baldosa y skyline lejano con ventanas en el cielo.
- Farolas de sodio (alguna LED) con cono de luz, halo y estrella de diafragma; asfalto mojado con charcos, estelas reflejadas de las farolas, ondas de lluvia y destellos. Lluvia fina iluminada por las farolas (solo gama alta escritorio; no llueve dentro del cuarto de Arganda).
- Colocación automática a partir del recorrido real de la cámara: prueba exacta de rectángulos orientados contra fotos, cámaras, líneas de visión y zonas de estación (nunca tapa una foto).
- Fotos como recuerdos: desenfocadas hasta que llegas (nítidas e intactas en reposo), se deshacen en ascuas al atravesarlas, reflejo en los charcos (gama alta), **fecha de carrete** naranja bajo cada foto (fuera del cuadro), **placa de calle esmaltada** por capítulo en cada transición y quemado de película entre capítulos.
- Etiqueta AF movida a la esquina superior derecha (ya no choca con el título 3D).
- Gancho de pruebas `window.__viaje.go(n)` (solo con `__VIAJE_NO_FPS_GUARD`) para capturas sin animar.
- Comprobado: build ok, `check:js` 166 KB/350, `photos:check` ok, Lighthouse móvil 99/100/100/100 en `/`, `/editores/`, `/en/`. Capturas escritorio 1280×800 y móvil 390×844 (renderizado por software, ~1–2 fps: **fps reales en GPU sin medir**).

## 3c. Web 4 — fotos a calidad nativa (10/11/2026, decisión de Marlon; prototipo publicado 1794347614-4ad4)
Antes: WebP **calidad 74** hasta 1600 px; en el 3D la foto era una textura de ≤1600 px dentro de un lienzo limitado a 1,75× (blanda en retina/4K), con balanceo y parallax que nunca la dejaban clavada a píxel; el lightbox ampliaba esa textura.
Ahora (mismo criterio que la web 2):
- `npm run photos:import -- "<carpeta>" <capítulo> [--featured N]` copia los **originales byte a byte** al capítulo (`src/content/fotos/NN-…/NN.jpg`). `place` y `date` pasan a opcionales (no se inventan).
- `scripts/build-photos.mjs` (en cada `build`/`dev`): JPEG 95, color 4:4:4, Lanczos, sRGB incrustado, EXIF conservado, 640–3200 px + original (`public/fotos/`, fuera del repo; caché en `node_modules/.astro/fotos`). `scripts/prune-dist.mjs` quita lo que Astro copiaba sin usar.
- 2D, /editores, /sobre: srcset/sizes reales; precarga de la foto LCP; **/editores enlaza al original** de cada foto; JSON-LD apunta al original; fuera el oscurecido permanente de las miniaturas del índice.
- **Viaje 3D:** al pararse ante una foto (y en el lightbox) se pone encima la **foto real del navegador** (`src/experience/native.ts`), encajada a píxel físico. En reposo la foto activa queda paralela al plano de cámara y se quitan balanceo y parallax para que sea un rectángulo exacto. Comprobado en navegador: 1× → posiciones enteras, 2× → medio píxel; la capa coincide con la foto 3D. Texturas 3D elegidas por su tamaño real en pantalla (hasta 3200 px) y liberadas al alejarse (memoria de GPU estable). Lienzo hasta 2× en gama alta.
- Lighthouse móvil con fotos de muestra: rendimiento 91–97 (aprueba ≥ 90), pero **LCP 2,4–3,4 s** según la pasada (antes 1,8 s): la foto LCP es ahora JPEG 95 (800 px, 82 KB) y compite con las miniaturas del índice a calidad completa. Por encima del presupuesto de 2,5 s: precio de la calidad máxima, igual que la web 2. Con los originales reales pesará más. Si algún día se quiere bajar: miniaturas del índice con menos calidad o diferidas.
- `build-photos` (webs 2 y 4) ya borra de la caché las versiones que no tocan: si se cambiaba una foto por otra más pequeña, se seguían sirviendo las versiones grandes de la foto anterior.
- Prototipo en Claude: 2 versiones por foto (640 y la mayor ≤ 2400 px) con `herramientas/preview-fotos.py` (el visor admite 256 archivos); la calidad nativa completa está en Cloudflare.
- **Negros en bandas:** la web 4 hereda el arreglo de la web 2 (sin `.gamma()`, reducción a 16 bits, `VERSION v2-q95-444-rgb16`). Comprobado en `fiesta-naranja/12`: mismo brillo que una reducción de referencia (diferencia media 1,5/255; con la gamma de 8 bits era 7/255 y los negros salían aplastados).

## 4. PRIORIDAD ACTUAL → Web 2 (setlist)
- Ya tiene solo 3 secciones, en orden fijo: **Fiesta Naranja** (`fiesta-naranja`), **Supernoventeros** (`supernoventeros`) y **Más trabajos** (`mas-trabajos`; EN «More work»). Rutas `/eventos/<slug>/` y `/en/events/<slug>/`.
- Lugar y fecha opcionales: se muestran «pendiente» si faltan. Más trabajos = «Varios lugares · Varias fechas», con lugar y fecha por foto.
- Retrato en /sobre (polaroid con cinta), JSON-LD y og:image. Páginas: setlist (home), 3 eventos y /sobre.
- **Hecho (10/11/2026), web 2:**
  - **Las 53 fotos de la carpeta** importadas con `photos:import` (3000 px, EXIF conservado): Fiesta Naranja 22, Supernoventeros 16, Más trabajos 15. Orden: por nombre de archivo (Fiesta Naranja y Supernoventeros) y por fecha EXIF (Más trabajos).
  - Portadas (elegidas por Álvaro): Fiesta Naranja = DSC03108 (DJ de espaldas con gorra blanca y láseres, `20.jpg`), Supernoventeros = DSC02202 (salto chaqueta amarilla, `05.jpg`), Más trabajos = _R006961 (escenario en blanco y negro, `12.jpg`).
  - **Sin «N fotos» en la cabecera de evento** (ni lugar). **Sin pies de foto visibles ni contador «Tema xx/yy»** en las galerías (decisión de Álvaro). Los `caption` siguen en los datos y en el JSON-LD; los `alt` (accesibilidad) se mantienen.
  - **Fotos alineadas:** en escritorio todas centradas en el mismo eje (máx. 1200 px de ancho y 86vh de alto); en móvil, carrusel con cajas de la misma altura (48vh) y la foto centrada. **Resúmenes de sección quitados** (eran «[PROVISIONAL] TODO»): `summary` ahora es opcional (schema, `photos:check` e importador) y si no hay texto no se muestra nada.
  - **Sin recortes:** portada de la home (CSS `contain` y shader WebGL `fit` con bandas negras), miniatura «siguiente evento» y transición entre páginas.
  - **Sin fechas visibles:** quitadas de pies, fichas del setlist y cabecera de evento (siguen en los datos y en el JSON-LD). **Tampoco se muestra el lugar**: fuera «Lugar: pendiente» y «Varios lugares» (home y cabecera de evento); solo saldría si se rellena `venue`/`city`.
  - **CALIDAD NATIVA (10/11/2026, «sea como sea»):** revisada toda la cadena. Pérdidas que había y cómo se han quitado:
    1. **WebGL pintaba las fotos** (home y eventos) en un canvas limitado a 1,5× de densidad y sin mipmaps → en retina se veían blandas. Ahora WebGL **nunca pinta una foto**: se ve el `<img>` real; WebGL solo hace la luz de escenario alrededor del marco en la home (en eventos, desactivado).
    2. **Importador** reducía a 3000 px y recomprimía a JPEG 88. Ahora **copia el original byte a byte** (hasta 6000 px). `src/content/eventos` pesa ~632 MB.
    3. **Astro** recomprimía a WebP 92 (color 4:2:0, se nota en luces rojas/naranjas). Ahora `scripts/build-photos.mjs` genera **JPEG 95 con color 4:4:4**, progresivo, reducción a 16 bits por canal (`pipelineColourspace('rgb16')`) + Lanczos, orientación EXIF aplicada y sRGB incrustado, en anchos 640/800/1080/1280/1600/2000/2400/3200 + `NN-original.jpg` (el original byte a byte; si pasara de 24 MiB, JPEG 97 4:4:4 a resolución completa, por el límite de 25 MiB por archivo de Cloudflare). Sale en `public/fotos/` (ignorado en git), con caché en `node_modules/.astro/fotos` (Cloudflare la conserva entre builds).
    4. `srcset` + `sizes` correctos: cada pantalla recibe la versión ≥ sus píxeles reales (comprobado: retina 2× → 2400 px; móvil 3× → 1080 px). Cada foto enlaza a su **original** (clic = resolución nativa).
    5. `scripts/prune-dist.mjs` borra de `dist/_astro` los originales que Astro copia sin usarlos (~585 MB).
    - `npm run build` = `build-photos` + `astro build` + `prune-dist`. Generar todo de cero: ~8 min aquí (luego, solo lo nuevo). `dist` ≈ 1,2 GB, 511 archivos (máx. 22 MB).
    - Coste: fotos ~2× más pesadas. Lighthouse móvil oscila: home P85–91, evento P83–93, /sobre P99. Presupuesto de imagen LCP subido de 250 a 600 KB en `check-js-budget.mjs`. Precarga (`<link rel=preload imagesrcset>`) de la foto LCP en home y eventos.
    - **BUG ARREGLADO (10/11/2026, 22:30):** la primera versión usaba `sharp.gamma(2.2)` para reducir «en luz lineal», pero sharp la hace a 8 bits → negros aplastados y con manchas en todas las versiones web (el original abierto suelto se veía bien). Quitada; ahora 16 bits. Comprobado: las 53 versiones tienen el mismo brillo medio que el original (máx. 0,25/255 de diferencia; antes hasta ~9). Quitado también el oscurecido de entrada (`filter: brightness(0.6)`) de las fotos en `global.css`: ningún efecto toca ya el color de una foto. **No volver a usar `.gamma()` en sharp.**
    - **Publicado y comprobado en Cloudflare** (commit `f3167b8`, build ~12 min, primero sin caché): https://alvarorodriguezeventos.pages.dev sirve `/fotos/` (versiones y originales, p. ej. `mas-trabajos/13-original.jpg` 4000×6000 bien orientado). Sin «N fotos», lugar, fechas ni TODO.
    - Prototipo de Claude: una versión por foto de 2400 px (JPEG 95 4:4:4), sin originales (límite de 64 MiB por publicación; publicado en 3 tandas).
  - Prototipo republicado en el mismo slug: versión `1794346654-9a6f` (73 archivos, una imagen por foto a ~2000 px).
  - **Página «Para promotores» eliminada** (ES y EN: `para-promotores.astro`, `en/for-promoters.astro`, `PromotersPage.astro`, enlaces del menú y del setlist). El campo `selected` de las fotos ya no se usa. Lighthouse revisa ahora `/sobre/` en su lugar.
  - Home: «Bis» → «Info» (ES y EN).
  - /sobre: bio nueva (cercana, a partir de su texto) con texto más grande; quitado el bloque «Herramientas y referencias» y el TODO de cámara. Retrato más grande (polaroid hasta 360 px). En escritorio ≥ 1100 px la ficha (Qué fotografío, Formación, Contacto) va a la derecha de la bio; en tablet y móvil, debajo.
- **Siguiente paso web 2:** si Álvaro quiere, pies con nombres, lugares y un resumen por sección (opcionales; ya no hay ningún TODO visible en la web).

## 5. Publicar un prototipo en Claude (lo que funcionó)
Restricciones del visor de artefactos: rutas relativas, fuentes como data: URI, sin descargas, máx. 256 archivos por publicación y **ningún nombre de archivo o carpeta que empiece por `_`**.
Herramientas en `herramientas/` del repo:
1. `node tools/package-site.mjs <carpeta-web> <nombre>` → `entregables/<nombre>/preview/` + zips de subida directa y de repositorio. Quita el router de Astro, incrusta las fuentes y deja 2 tamaños de imagen.
2. `python3 tools/fix-underscore.py entregables/<nombre>` → renombra `_astro` a `x_astro`.
3. Webs 2 y 3: `unify-loupe.py`, luego `one-per-photo.py <dir> 1200` y `reduce-preview.py <dir> 1200` → una imagen por foto (si no, más de 256 archivos).
4. `font-display:optional` → `swap` en el preview (si no, en el visor no carga la Permanent Marker).
4b. Webs con fotos nativas en `/fotos/` (2 y 4): `python3 herramientas/preview-fotos.py <preview> <dist> 2400` → 2 versiones por foto y todas las rutas relativas (también las del JSON del viaje).
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
  - Calle nueva: medir fps en GPU real (portátil normal y móvil). Si va justa, bajar edificios de la 2ª fila, lluvia o reflejos (ya se apagan solos al degradar).
  - En móvil, la foto siguiente asoma como rectángulo oscuro bajo la actual (eje recto).
  - Auditoría de accesibilidad y rendimiento sin repetir tras el rediseño.
  - La ventana del cuarto de Arganda se ve como un rectángulo claro desde una parada.
  - En móvil no se ha recapturado tras el último ajuste.
  - El título 3D «Desde Arganda» ya está arreglado (las paredes lo tapaban).
- **Web 3:** al filtrar, 8 fotos quedan a unos 245 px (se quería 400).
- **Builds lentos** la primera vez por AVIF (web 1: 11 min). Los siguientes usan caché.

## 8. Decisiones tomadas (no reabrir)
- Presupuestos: LCP < 2,5 s, CLS < 0,05, INP < 200 ms, JS inicial < 90 KB gzip (web 4: escena 3D diferida < 350 KB), Lighthouse ≥ 90.
- Un único sistema de animación por web. Lenis solo en escritorio. Sin ScrollTrigger si no se usa.
- Sin marca de agua. Crédito en pies y JSON-LD. Webs 2 y 4: las versiones conservan el EXIF (build-photos).
- Las fotos en WebGL se pintan sin iluminación, sin tone mapping ni grano.
