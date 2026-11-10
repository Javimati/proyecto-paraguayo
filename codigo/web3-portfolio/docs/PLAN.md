# PLAN — Web 3: «Archivo» de Álvaro Rodríguez Valverde

Portfolio global: todo lo que hace en un solo sitio. Orden de prioridad fijo: **Actualidad → Calle → Reportaje → Directo → Eventos → Bodas**. El lector principal sigue siendo un editor gráfico con prisa; los clientes de eventos y bodas tienen su propia página (`/encargos`).

## 1. Concepto: la mesa de luz

Un archivo de fotógrafo no es una galería: es una mesa de luz con diapositivas montadas, etiquetadas a mano y ordenadas por cajas. La web es eso.

- **Home = mesa de luz.** Un plano luminoso de borde a borde con todas las diapositivas (montura blanca, ventana 3:2, etiqueta con apartado y número). Se recorre arrastrando o con la rueda, sin fin (cada diapositiva se recoloca por módulo: no hay duplicados en el DOM). Las de prensa quedan en el centro al entrar.
- **Cajas = apartados.** La barra inferior filtra la mesa por apartado; las diapositivas que no tocan se apagan y las demás se reagrupan en el centro (en móvil, Flip sobre la rejilla). Sin JS, cada filtro es un enlace a `/trabajo/<apartado>`.
- **Proyección = serie.** Al pulsar una diapositiva, la foto crece desde su montura hasta pantalla completa (View Transition continua) mientras la luz de la mesa se apaga: entras al proyector. En la serie, el fondo toma una versión muy oscura del color dominante de cada foto (luz ambiente de proyección) y la imagen reacciona a la velocidad del scroll.
- **Sello de archivo.** El único acento es la tinta violeta de los sellos de archivo: filtro activo, foco, selección de prensa.

### Momentos memorables (solo dos)

1. **Encendido.** Al cargar la home, la mesa arranca apagada y se enciende como un tubo fluorescente: dos destellos cortos (≤ 2 por segundo) y luz estable; las diapositivas «caen» sobre la mesa desde el centro hacia fuera con un giro mínimo, como colocadas a mano. Con `prefers-reduced-motion`, la mesa está encendida desde el principio y no hay destellos.
2. **La lente (capa 2).** Con WebGL, la mesa se ve a través de una lupa de mesa de luz: curvatura de lente hacia los bordes, desenfoque suave fuera del centro (profundidad de campo) y la diapositiva bajo el cursor se levanta y se ilumina por detrás.

Todo lo demás es sobrio: tipografía grande y tranquila, mucho aire, ninguna animación que no responda a una acción.

### Revisión contra clichés (antes de construir)

- *Fondo crema cálido + serif + terracota* → descartado: la mesa es **blanco frío retroiluminado** (luz de 5000 K) y el acento es **tinta de sello violeta**, no terracota.
- *Negro con acento ácido* → solo la serie es oscura, y su color lo pone cada foto, no un acento.
- *Periódico con filetes y columnas* → ya lo usa la web 1 (hoja de contactos); aquí no hay filetes ni monoespaciada.
- *Mayúsculas espaciadas como etiqueta* → las etiquetas de montura van en minúscula/versalita natural de Schibsted, tamaño pequeño, como rotulador de archivo.
- *Monoespaciada para datos* → no: Schibsted Grotesk con cifras tabulares.
- *Tarjetas con sombra* → las monturas son objetos físicos con una sombra de contacto mínima sobre la mesa (2 px), no tarjetas flotantes.

## 2. Sistema de diseño

### Color

| Token | Hex | Uso |
|---|---|---|
| `--mesa` | `#f2f4f1` | Luz de la mesa (blanco frío) |
| `--mesa-borde` | `#d6dad4` | Viñeta de la mesa, separadores |
| `--montura` | `#fbfbf7` | Montura de diapositiva |
| `--tinta` | `#16181b` | Texto principal |
| `--tinta-2` | `#565c61` | Metadatos (AA sobre mesa y montura) |
| `--sello` | `#3a2ec9` | Acento: tinta de sello de archivo (AA) |
| `--proyector` | `#0c0d0f` | Serie (sala oscura) |
| `--proyector-texto` | `#ebece8` | Texto en serie |
| `--proyector-meta` | `#a4a8ac` | Metadatos en serie (AA) |
| `--sello-claro` | `#a49dff` | Acento sobre oscuro (AA) |

### Tipografía (autoalojada, woff2)

- **Newsreader** (variable con eje óptico) — titulares y nombre, en caja normal. Es una serif de lectura de prensa de Production Type: a tamaño grande tiene contraste fino y elegante, a tamaño pequeño aguanta. Da el tono de archivo y de pie de foto de diario sin caer en la Didone de revista de moda.
- **Schibsted Grotesk** — interfaz, etiquetas, pies de foto y textos. Diseñada para los diarios del grupo noruego Schibsted: es literalmente una grotesca de redacción. Cifras tabulares para fechas y números.

Escala 1,25 (base 16): 12,8 · 16 · 20 · 25 · 31 · 39 · 49 · 61 · 76 · fluido hasta `clamp(3rem, 8vw, 8.5rem)` en títulos de serie. Izquierda siempre; líneas ≤ 70 caracteres.

### Retícula y maquetación

12 columnas, margen `clamp(16px, 4vw, 64px)`.

```
HOME (capa 1+, escritorio)                         HOME (capa 0 / móvil)
┌──────────────────────────────────────────┐       ┌────────────────────┐
│Álvaro Rodríguez Valverde   Editores …  EN│       │Álvaro Rodríguez V. │
│  ▢   ▢    ▢   ▢    ▢   ▢    ▢   ▢        │       │Archivo de fotografía│
│    ▢   ▢    ▢  [▢]   ▢    ▢   ▢    ▢     │       │Actualidad ─────────│
│  ▢   ▢    ▢   ▢    ▢   ▢    ▢   ▢        │       │ ▢ ▢                │
│    ▢   ▢    ▢   ▢    ▢   ▢    ▢   ▢      │       │ ▢ ▢                │
│Arrastra…  Todo Actualidad Calle … Bodas  │       │Calle ──────────────│
└──────────────────────────────────────────┘       └────────────────────┘

SERIE (proyector)
┌──────────────────────────────────────────┐
│Actualidad · volver a la mesa         EN  │
│Título de la serie en Newsreader grande   │
│Madrid, mayo de 2026      resumen         │
│        ┌──────── foto ────────┐          │
│        └──────────────────────┘          │
│        MADRID, 01/05/2026 — Pie …        │
│                                  03 / 08 │
└──────────────────────────────────────────┘
```

### Motion

- Intro de la home (una vez por visita, `sessionStorage`): encendido + caída de diapositivas (1,6 s en total).
- Arrastre con inercia (GSAP `quickTo` sobre el desplazamiento del plano; rueda = desplazamiento directo).
- Filtro: reagrupado con GSAP (escritorio) / Flip (rejilla móvil), 0,7 s `expo.inOut`.
- Hoja → serie: View Transition sobre la `<img>`, 0,8 s; la mesa se funde a negro.
- Serie: color ambiente con transición de 1,2 s; inclinación por velocidad (capa 1) o curvatura + separación RGB mínima (capa 2).
- Reduced motion: sin intro, sin inercia (el arrastre es directo), sin inclinación, transiciones de opacidad de 150 ms.

## 3. Arquitectura

Igual que la web 1 (Astro estático, content collections con zod, i18n ES/EN, ciclo de vida con `<ClientRouter />`), con estos cambios:

- El esquema añade `section` (enum de los seis apartados) y `featured` (entra en `/editores`).
- `src/scripts/mesa.ts`: mesa infinita (layout, arrastre, rueda, teclado, filtros, intro).
- `src/scripts/grid-filter.ts`: filtro con Flip en la rejilla (móvil y capa 1 estrecha).
- `src/scripts/series.ts`: contador, luz ambiente, Escape, inclinación por velocidad.
- `src/scripts/webgl/`: capa 2 con **OGL** (≈ 25 KB gzip frente a ≈ 150 KB de Three.js; solo necesitamos planos texturizados y dos shaders). Un canvas fijo, una malla subdividida por diapositiva/foto sincronizada con el DOM. Modo `mesa` (lente, desenfoque, elevación al pasar) y modo `serie` (revelado, curvatura y RGB por velocidad). Monitor de fps: < 45 durante 2 s → se apaga y vuelve a capa 1.

Capas: idénticas condiciones que la web 1 (WebGL2, sin reduced motion, ≥ 1024 px, ≥ 4 núcleos y ≥ 4 GB si se sabe; `import()` después del LCP).

## 4. Páginas

ES / EN: `/` · `/trabajo/<apartado>` (`/en/work/<section>`) · `/series/<slug>` · `/editores` (`/en/editors`) · `/encargos` (`/en/commissions`) · `/sobre` (`/en/about`) · `/contacto` (`/en/contact`) · `404`.

## 5. Medidas reales (build provisional, 10/11/2026)

- JS inicial por página: 8,9 KB gzip (núcleo + router). `/editores`: 1,5 KB.
- Diferido: mesa 2,8 KB + GSAP 27 KB (solo escritorio); `motion-desktop` (ScrollTrigger + SplitText + Lenis) 25,8 KB; filtro móvil (GSAP Flip) 9,8 KB; **WebGL (OGL + shaders) 16,7 KB**, cargado después del LCP.
- Fuentes: Newsreader en dos cortes estáticos de 23 KB (instanciados desde la variable de 132 KB con `scripts/make-fonts.py`) + Schibsted 400/500.
- Lighthouse móvil: home 99/100/100/100 (LCP 1,9 s), serie 100/100/100/100 (LCP 1,4 s), `/editores` 100/100/100/100 (LCP 1,5 s), `/encargos` 99/100/100/100.

## 6. Presupuestos

Los mismos: LCP < 2,5 s, CLS < 0,05, INP < 200 ms, JS inicial < 90 KB gzip (WebGL aparte), imagen de portada < 250 KB, Lighthouse ≥ 90 en las cuatro categorías.

## Revisión 2 (tras jurado de diseño + auditoría a11y/rendimiento)

- **Encendido sin destellos (WCAG 2.3.1).** La mesa ya es mesa antes de encenderse (no hay estado gris previo); el difusor sube de 96 % a 100 % con un titileo mínimo arriba (98 %). Medido con screencast CDP a ~30 fps (luminancia relativa media por fotograma): 0,90 → 0,80–0,86 durante la rampa → 0,69 cuando caen las diapositivas (gradual, ~400 ms). **Transiciones contables (≥10 % con el estado oscuro < 0,8): 1 en toda la intro → 0,5 destellos/s** (antes 3,0–3,5/s). Diapositivas sin transición CSS de opacidad; la caída la anima GSAP y la capa 2 no pinta una foto mientras su montura cae.
- **Foto fiel en WebGL.** Shader sin grano, viñeteo, desenfoque ni separación RGB. La única intervención es la entrada en la serie (fundido de exposición, −4 pasos → 0) y una curvatura máxima de 1,1 % con el scroll. ImageBitmap con `imageOrientation: 'flipY'`.
- **Cuentahílos** en lugar de la lente global: lupa de 260 px ×3 con la textura de 640 px (bajo demanda) y lugar, fecha y serie debajo. Decorativa (`aria-hidden`), solo puntero fino.
- **Diapositivas más grandes** (`--slide: clamp(220px,17vw,300px)`); al filtrar, rejilla que llena el área útil (vista − cabecera − ficha − píldora). Con monturas cuadradas, 8 fotos de Calle en 1440×900 llegan a ~245 px de ventana: el límite lo pone la proporción cuadrada de la montura, no el código.
- **Numeración de archivo estable** (`archiveNumber()` en `src/lib/series.ts`) y etiqueta «MADRID 01.05.26 · 015»; en hover/foco, el título de la serie.
- **Sello «Selección»** (`pick`, 6 fotos) separado de `featured` (/editores, 15).
- **Rendimiento:** sondeo WebGL2 una vez por sesión con `loseContext`; apagado por fps recordado en `sessionStorage`; `webglcontextlost` → capa 1; texturas de 400 px solo de las fotos cercanas, una subida por frame; la mesa no escribe estilos en reposo; sin máscaras ni `backdrop-filter`; ScrollTrigger fuera; filtro móvil sin Flip ni GSAP (CLS 0, eventos ≤136 ms a CPU 4×); `check:js` cuenta los `import()` que siempre corren.
- **Accesibilidad:** títulos de apartado fuera del tab en la mesa viva; foco restaurado al volver de una serie (Escape o «Volver»); tira móvil con `role=region`, nombre y `tabindex`; `.sr-only` contenidos (la cabecera móvil desbordaba hasta 608 px); 404 con `noindex`; barra final en todas las rutas (`trailingSlash: 'always'`).
- **Descartado:** `modulepreload` del chunk de la mesa — Vite le pone hash y el inline del `<head>` no puede conocerlo; la mesa se pide en cuanto corre `app.ts`.
