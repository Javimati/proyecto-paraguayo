# PROMPT — Portfolio web de Álvaro Rodríguez Valverde (fotoperiodista)

> Pega todo este documento en Claude Code (o guárdalo como `CLAUDE.md` en la raíz de una carpeta vacía y escribe "empieza").
> Lo que va entre **[PENDIENTE: …]** se rellena con las respuestas de Álvaro. No inventes nada que esté marcado como pendiente: deja el hueco visible en el código como `TODO`.

---

## 0. Tu papel

Actúas como **director de arte + creative developer senior** de un estudio que gana Awwwards (piensa en el nivel de los portfolios que publica Codrops en 2026). No haces "una web de fotógrafo con plantilla": haces una pieza que un editor gráfico de Europa Press, EFE o El País recuerde al día siguiente.

Antes de escribir código:

1. Carga y sigue la skill `frontend-design` si está disponible.
2. Lee este documento entero.
3. Escribe en `docs/PLAN.md` el concepto, el sistema de diseño (tipos, color, retícula, motion) y la arquitectura. Después construye.
4. Usa subagentes en paralelo cuando ayude, por ejemplo: uno revisa rendimiento (Lighthouse, peso de JS e imágenes), otro accesibilidad (teclado, contraste, `prefers-reduced-motion`) y otro hace crítica de diseño "como un jurado de Awwwards" comparando con las referencias de la sección 4. Corrige lo que encuentren antes de dar nada por terminado.

---

## 1. Quién es y para qué sirve la web

- **Nombre:** Álvaro Rodríguez Valverde. 20 años. Arganda del Rey (Madrid).
- **Formación:** 2º del Grado Superior de Iluminación, Captación y Tratamiento de Imagen, Campus FP Atocha (Madrid).
- **Lo suyo:** fotoperiodismo, fotografía de calle, reportaje, actualidad. También eventos, conciertos y bodas, pero **en segundo plano** (no deben dominar la web).
- **Objetivo de la web:** que agencias y medios (Europa Press, EFE, Servimedia, Contacto, Getty, AFP, Reuters, AP, El País…) le cojan en prácticas o como colaborador. El lector principal es **un editor gráfico con prisa** que abre el enlace desde un correo, mira 30 segundos y decide.
- **Idiomas:** español por defecto + inglés (AP, Reuters, AFP, Getty tienen editores que no hablan español). Selector ES/EN sencillo.

Datos pendientes (déjalos como TODO visibles):

- [PENDIENTE: enlace/archivos de las fotos, en alta]
- [PENDIENTE: series de reportaje: título, lugar, fecha y texto corto de cada una]
- [PENDIENTE: pie de foto de cada imagen: qué, quién, dónde, cuándo]
- [PENDIENTE: bio en primera persona, 60–90 palabras]
- [PENDIENTE: email, teléfono, Instagram]
- [PENDIENTE: equipo (cámara/objetivos) y software de edición, solo si él quiere mostrarlo]
- [PENDIENTE: fotógrafos que le inspiran]
- [PENDIENTE: dominio, si compra uno]

---

## 2. Concepto creativo (obligatorio partir de aquí)

**"Hoja de contactos / teletipo de agencia".** La web se comporta como el material de trabajo real de un fotoperiodista, no como una galería decorativa:

1. **La hoja de contactos como portada.** La home es una hoja de contactos viva: una retícula densa de fotogramas con números de fotograma, bordes de película y marcas de exposición. Al pasar el cursor aparece una **lupa** (cuentahílos) que amplía el fotograma bajo el ratón. Algunos fotogramas están **marcados con lápiz graso rojo** (un círculo o una cruz dibujados a mano, animados como trazo SVG). Esos son "los elegidos", las mejores fotos, igual que hacen los editores con las hojas de contactos de Magnum.
2. **Revelado.** Cuando una imagen entra en pantalla no hace un simple fade: se **revela** con un shader WebGL que imita el revelado químico (de negro a la imagen, con grano, viñeteo y un ligero desplazamiento de canales que se asienta). Corto (0,6–1,0 s) y elegante, nada de efectos de feria.
3. **Pie de foto como teletipo.** Cada foto tiene su pie con formato de agencia: `MADRID, 14/03/2026 — Texto del pie… (FOTO: Álvaro Rodríguez)`. Al entrar en pantalla se escribe con un efecto de teletipo/máquina de escribir rápido, en monoespaciada. Esto es lo que diferencia a un fotoperiodista de "alguien con cámara": que se vea.
4. **De la hoja a la serie.** Al hacer clic en un fotograma marcado, el fotograma crece hasta pantalla completa con una transición continua (GSAP Flip o View Transitions, la imagen no "salta") y te lleva a la serie de ese reportaje.
5. **Velocidad de scroll = película.** En las series, el scroll mueve las fotos como una tira de película: deformación sutil según la velocidad de scroll, en WebGL, que vuelve a reposo al parar.

Paleta sugerida (ajústala con criterio): negro de cuarto oscuro, gris papel de contacto, blanco roto y **un único acento rojo lápiz graso** para las marcas, los enlaces activos y la selección. Grano de película muy sutil sobre toda la web (canvas o SVG con `feTurbulence`, animado a pocos fps).

Si se te ocurre una vuelta mejor sobre este concepto, propónla en `PLAN.md` en 5 líneas, pero **no lo cambies por una web genérica**.

---

## 3. Lo que NO quiero (anti "web de IA")

- Nada de: hero con nombre centrado y botón "Ver portfolio", tarjetas con sombra, glassmorphism, degradados morados/azules, iconos de redes de colores, secciones "Servicios" con tres columnas, testimonios inventados.
- Tipografía: prohibido Inter, Roboto, Arial, Poppins, Montserrat, Space Grotesk y fuentes del sistema. Elige un par con carácter (por ejemplo, una grotesca condensada o una serif editorial para titulares + una monoespaciada para pies de foto y metadatos) y justifícalo en `PLAN.md`. Autoaloja las fuentes (woff2, `font-display: swap`, subset latino).
- Nada de texto de relleno tipo "apasionado por capturar momentos únicos". El texto es seco y periodístico.
- No inventes premios, publicaciones, clientes ni datos de Álvaro.
- Los efectos nunca tapan la foto: la foto manda. Si un efecto compite con la imagen, se quita.

---

## 4. Referencias que debes estudiar (busca y mira cómo están hechas)

- **Félix Péault — Photographer** (Honorable Mention de Awwwards, enero de 2026): práctica fotográfica de calle, movimiento y tipografía grande.
- **Codrops 2026**, tutoriales que encajan con este proyecto:
  - "Building a Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js" (feb 2026): sincronizar planos WebGL con las `<img>` del DOM y revelados con shader al hacer scroll. **Es la base técnica más cercana a lo que quiero.**
  - "Building a Scroll-Reactive 3D Gallery with Three.js, Velocity, and Mood-Based Backgrounds" (mar 2026): reacción a la velocidad de scroll y fondo que cambia según la paleta de cada foto.
  - "Creating a Smooth Horizontal Parallax Gallery: From DOM to WebGL" (feb 2026): primero versión DOM y después mejora WebGL. **Este enfoque progresivo es obligatorio aquí.**
  - "Joffrey Spitzer Portfolio: A Minimalist Astro + GSAP Build with Reveals, Flip Transitions…" (feb 2026): contención, reveals y Flip.
  - Hiroki Watanabe (mar 2026): transiciones de imagen a pantalla completa con máscaras SVG y GSAP.
  - Casos de estudio de portfolios de fotógrafos en Codrops (Motoyoshi Takamitsu, Dondre Green): cómo priorizan la imagen.
- **Magnum Photos** y **Contacto**: cómo presentan las series y los pies de foto.
- **Hojas de contactos de Magnum** (exposición "Magnum: Contact Sheets"): para la estética de marcas en rojo.

Si alguna referencia ya no existe, busca equivalentes en Awwwards (filtro Photography/Portfolio, 2026) y Codrops.

---

## 5. Stack técnico (decidido; cambia solo con una razón escrita en PLAN.md)

- **Astro** (salida 100 % estática): rapidísimo, cero JS por defecto, y su `<Image>`/`<Picture>` genera AVIF + WebP + `srcset` en el build.
- **GSAP 3** (gratis completo, incluidos ScrollTrigger, Flip y SplitText) para todo el motion. **No mezcles** GSAP con Framer Motion/Motion: un único sistema de animación.
- **Lenis** para el scroll suave, sincronizado con ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)` y el `raf` de Lenis dentro de `gsap.ticker` (un solo bucle, `gsap.ticker.lagSmoothing(0)`).
- **Three.js** (o **OGL** si el peso se dispara; documéntalo) para la capa WebGL: un **único canvas fijo** detrás del DOM, planos sincronizados con las posiciones de las `<img>` y shaders GLSL propios (revelado, grano, deformación por velocidad, lupa).
- **Transiciones entre páginas:** View Transitions de Astro (`<ClientRouter />`). Reinicia GSAP, ScrollTrigger y Lenis en `astro:page-load` y destrúyelos en `astro:before-swap` para que no se acumulen bucles.
- TypeScript, CSS propio con variables (tokens). Tailwind solo si lo justificas y **sin** la paleta por defecto.

---

## 6. Que funcione en casi cualquier ordenador (mejora progresiva)

Esto es requisito, no extra:

1. **Capa 0 (siempre funciona):** HTML semántico + CSS. Todas las fotos se ven, con sus pies, sin JavaScript.
2. **Capa 1:** GSAP + Lenis (reveals DOM, Flip, teletipo).
3. **Capa 2 (WebGL):** solo si se cumplen **todas**: hay WebGL2, no hay `prefers-reduced-motion`, el ancho es ≥ 1024 px y `navigator.hardwareConcurrency >= 4` (y `deviceMemory >= 4` cuando exista). Carga Three.js con `import()` dinámico **después** del LCP. Si los fps caen por debajo de ~45 durante 2 s, apaga la capa WebGL y vuelve a la capa 1 sin que se note.
4. **Móvil:** sin lupa, sin Lenis (scroll nativo), revelado en CSS y tira de fotos con `scroll-snap`.
5. `prefers-reduced-motion: reduce` → cero movimiento decorativo y transiciones de opacidad cortas.

**Presupuestos** (mídelos con Lighthouse en móvil simulado, y que fallen el build si se pasan):

- LCP < 2,5 s, CLS < 0,05, INP < 200 ms.
- JS inicial < 90 KB gzip (sin contar Three.js, que va diferido).
- Imagen de portada < 250 KB. Ninguna foto servida más de 2× el ancho de su hueco.
- Lighthouse ≥ 90 en Performance, Accessibility, Best Practices y SEO.

---

## 7. Imágenes y contenido (cómo lo vamos a meter)

- Carpeta `src/content/series/<slug>/`, con las fotos y un `index.md` por serie que tenga en el *frontmatter*: `title`, `title_en`, `place`, `date`, `summary`, `summary_en`, `cover`, `order` y una lista `photos` con `file`, `caption`, `caption_en`, `date`, `place`, `selected` (booleano: lleva marca roja en la hoja de contactos), `alt`, `alt_en`.
- Usa **Astro Content Collections** con esquema (zod) para que un pie de foto que falte rompa el build.
- Script `npm run photos:check`: avisa de fotos sin pie, sin `alt`, de más de 4000 px o sin metadatos de autor, y extrae la paleta dominante de cada foto para el fondo (estilo Codrops "mood").
- Las fotos originales no se suben tal cual: Astro genera AVIF/WebP en varios anchos. Las de pantalla completa llevan `fetchpriority="high"` solo en la portada; el resto, `loading="lazy"`.
- Marca de agua: **no**. Metadatos de copyright (IPTC/EXIF: autor) **sí**; no los borres al optimizar si la herramienta lo permite. Si no, indícalo en el README.

---

## 8. Páginas

1. **Home: hoja de contactos** (concepto 2.1). Arriba, en monoespaciada pequeña: `ÁLVARO RODRÍGUEZ VALVERDE — FOTOPERIODISMO — MADRID`. El nombre grande aparece una vez, con un reveal tipográfico (SplitText), no como hero de plantilla.
2. **Serie** (`/series/[slug]`): título, lugar y fecha + la tira de fotos (concepto 2.5) + pie de foto en teletipo de cada imagen + navegación "siguiente serie" que precarga la portada de la siguiente.
3. **Para editores** (`/editores`, también en EN): **la página más importante para conseguir prácticas.** Sin efectos: rejilla limpia de las ~15 mejores fotos con su pie completo, bio de 3 líneas, disponibilidad, botón **"Descargar portfolio PDF"** y botón **"Copiar email"**. Debe cargar en menos de 1 segundo y leerse en 30. El enlace de esta página es el que va en los correos a las agencias.
4. **Sobre mí / Contacto:** bio, formación, en qué tipo de trabajo encaja, email (botón copiar + `mailto:`), teléfono, Instagram y CV en PDF. Nada de formulario con backend.
5. **404** con personalidad (un fotograma velado de la hoja de contactos, "Este negativo se veló").

SEO y compartir: `<title>` y descripción por página, Open Graph con una foto suya por serie, `sitemap.xml`, `robots.txt`, datos estructurados `Person` + `ImageObject` (autor y `creditText`), `lang` correcto y `hreflang` ES/EN.

---

## 9. Accesibilidad

- Todo se puede usar con teclado: la hoja de contactos se navega con las flechas, Enter abre y Escape cierra.
- `alt` real en cada foto (describe lo que se ve, no "foto 1"). El pie de foto va en `<figcaption>`.
- Contraste AA en todo el texto, también los metadatos en gris.
- El cursor-lupa es decorativo (`aria-hidden`) y nunca sustituye a una acción.
- El teletipo no se lo lee el lector de pantalla letra a letra: el texto completo está en el DOM desde el principio.

---

## 10. Despliegue gratis (hazlo tú y deja un README paso a paso)

Es una web **estática**, así que **no hace falta ningún servidor**. De la lista de servicios gratis que tenemos (Oracle Cloud, GCP, AWS Lambda, Cloudflare Workers, DynamoDB, R2, Firestore, Supabase, CloudFront, Cloudflare Pages, GitHub Pages, GitHub Actions):

- **Elegido: Cloudflare Pages.** Plan gratis sin límite de tráfico para archivos estáticos y 500 builds al mes. Flujo: repo en GitHub → conectar en Cloudflare Pages → build `npm run build`, salida `dist/` → cada `git push` publica. Añade previsualizaciones por rama.
- **Alternativa: GitHub Pages** + GitHub Actions (Astro tiene la acción oficial `withastro/action`). Tiene un límite blando de 100 GB de tráfico al mes, suficiente para un portfolio.
- **No usar** (sobra para esto): VMs de Oracle/GCP, Lambda, DynamoDB, Firestore, Supabase. **Cloudflare R2** solo si las fotos optimizadas superan cientos de MB.
- **Dominio:** deja preparado el paso para conectar un dominio propio (por ejemplo `alvarorodriguez.photo` o `.es`, unos 10–15 € al año) con HTTPS automático en Cloudflare. [PENDIENTE: dominio]
- **Contacto sin backend:** `mailto:` + copiar al portapapeles. Si más adelante quiere un formulario, una Pages Function (cuenta contra el cupo gratuito de Workers, 100.000 peticiones al día).

El README debe explicar, para alguien que no programa: cómo añadir una serie nueva, cómo cambiar un pie de foto, cómo publicar (un `git push`) y cómo ver la web en local (`npm install` → `npm run dev`).

---

## 11. Orden de trabajo y entrega

1. `docs/PLAN.md` (concepto, tipos, color, retícula, motion, arquitectura, presupuestos).
2. Esqueleto de Astro + tokens + tipografías + contenido de ejemplo con **3 series de prueba** (usa imágenes de muestra con licencia libre, marcadas claramente como provisionales, hasta tener las de Álvaro).
3. Capa 0 completa y accesible → capa 1 (GSAP/Lenis) → capa 2 (WebGL) → página "Para editores".
4. Pasada de los subagentes (rendimiento, accesibilidad, crítica de diseño) y correcciones.
5. Despliegue en Cloudflare Pages + README.
6. Al terminar, dame: la URL, capturas de escritorio y móvil, la puntuación de Lighthouse y la lista de TODO pendientes de contenido.

Trabaja por fases y enséñame la home en cuanto la capa 0 + 1 funcionen, antes de meter WebGL, para validar la dirección.