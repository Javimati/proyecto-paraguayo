# PLAN — Portfolio de Álvaro Rodríguez Valverde

## 1. Concepto

**Hoja de contactos / teletipo de agencia.** La web es material de trabajo, no galería.

- **Cada serie es un rollo.** En la home, cada reportaje es una tira de película (un rollo) dentro de una hoja de contactos de papel. Los fotogramas llevan números de borde («14», «14A») y el rótulo del rollo (título, lugar, fecha) va impreso en el margen de la película como el *edge print* de Kodak.
- **Las elegidas, a lápiz graso.** Las fotos con `selected: true` llevan un círculo rojo dibujado a mano (trazo SVG que se anima una vez). El editor ve en 3 segundos cuáles son las buenas.
- **Papel → cuarto oscuro.** La home es papel (claro). Al abrir una serie entras al cuarto oscuro (fondo negro): la transición del fotograma a pantalla completa es el paso de la hoja a la ampliadora.
- **Pie de agencia.** Todas las fotos llevan pie en formato `LUGAR, DD/MM/AAAA — Texto. (FOTO: Álvaro Rodríguez)`, en monoespaciada, escrito en teletipo al entrar en pantalla (el texto completo está en el DOM desde el principio).
- **Contador de fotograma.** En la serie, un contador fijo `07/12` hace de numerador de cámara: dice dónde estás sin decoración extra.

**Vuelta propuesta (5 líneas):**
1. Home clara (papel) y series oscuras (cuarto oscuro) en lugar de todo negro: la hoja de contactos real es papel, y el contraste papel/oscuro da significado a la transición.
2. Un rollo por serie en vez de una retícula mezclada: así la hoja de contactos también es el índice de series.
3. Los fotogramas verticales se muestran dentro del marco 3:2 sobre negro, como en una hoja real, sin recortar la foto.
4. El rótulo de cada rollo hace de enlace a la serie: no hace falta menú de «trabajos».
5. La página `/editores` rompe la metáfora a propósito: rejilla limpia, sin efectos, para el lector con prisa.

## 2. Sistema de diseño

### Color (tokens en `src/styles/tokens.css`)

| Token | Hex | Uso |
|---|---|---|
| `--papel` | `#d4d1c9` | Fondo de la hoja de contactos (gris papel baritado) |
| `--papel-claro` | `#ecebe6` | Blanco roto: texto sobre oscuro, fondo de `/editores` |
| `--grafito` | `#1f1d1b` | Texto principal sobre papel |
| `--gris-meta` | `#4a4743` | Metadatos sobre papel (AA ≥ 4,5:1 sobre `--papel`) |
| `--cuarto-oscuro` | `#121110` | Fondo de serie y base de la película |
| `--borde-pelicula` | `#8e8a82` | Impresión del borde de película (números de fotograma) sobre negro |
| `--lapiz` | `#d0261d` | Lápiz graso: marcas, foco, selección |
| `--lapiz-texto` | `#9e1a13` sobre papel / `#ff5a4d` sobre oscuro | Enlaces activos con contraste AA |

Un único acento: el rojo. Nada de degradados. Grano de película con `feTurbulence` en SVG, 4–5 % de opacidad, animado por pasos a ~8 fps con CSS (`steps()`), apagado con `prefers-reduced-motion`.

### Tipografía (autoalojada con Fontsource, woff2, subset latino, `font-display: swap`)

- **Big Shoulders Display** (700/800) — titulares y nombre. Grotesca muy condensada, de rotulación urbana: cabe un titular largo en una línea, recuerda a los rótulos de prensa y al *edge print* de la película, y no compite con la foto porque ocupa poco ancho.
- **IBM Plex Mono** (400/500) — pies de foto, metadatos, teletipo, navegación y textos cortos. Es la letra de terminal de agencia: monoespaciada con personalidad (las `a` y `g` de Plex), muy legible a 14–16 px.

Escala (ratio 1,333, base 16 px): 12 · 14 · 16 · 21 · 28 · 38 · 50 · 67 · fluido hasta `clamp(4rem, 14vw, 13rem)` para el nombre. Textos alineados a la izquierda; líneas ≤ 70 caracteres.

### Retícula

- 12 columnas, margen lateral `clamp(16px, 4vw, 56px)`, hueco 16 px.
- Hoja de contactos: cada rollo es un `grid` de fotogramas `repeat(auto-fill, minmax(220px, 1fr))` (escritorio 6 por fila a 1440 px; móvil 2). La película (negro + perforaciones con `repeating-linear-gradient`) es continua por fila.
- Serie: foto a ancho de contenido (máx. 88 vh de alto), pie debajo alineado a la izquierda, 70ch.

```
HOME (papel)
┌───────────────────────────────────────────────────────────┐
│ ÁLVARO RODRÍGUEZ VALVERDE — FOTOPERIODISMO — MADRID  ES/EN│
│ Series  Para editores  Sobre mí                           │
│ ÁLVARO RODRÍGUEZ          (nombre grande, una vez)        │
│ ┌ ▸ ROLLO 01  TÍTULO · LUGAR · FECHA ─────────────────────┐│
│ │▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪││
│ │[ 1 ][ 2 ][(3)][ 4 ][ 5 ][ 6 ]   (3) = círculo rojo      ││
│ │▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪││
│ └─────────────────────────────────────────────────────────┘│
│ ┌ ▸ ROLLO 02 …                                            ││
└───────────────────────────────────────────────────────────┘

SERIE (cuarto oscuro)
┌───────────────────────────────────────────────────────────┐
│ ← Hoja de contactos          ROLLO 02                ES/EN│
│ TÍTULO DE LA SERIE EN CONDENSADA                          │
│ LUGAR — FECHA        resumen (mono, 60ch)                 │
│ ┌─────────────── foto ───────────────┐                    │
│ └────────────────────────────────────┘                    │
│ MADRID, 14/03/2026 — Pie… (FOTO: Álvaro Rodríguez)        │
│ …                                                  07/12  │
│ Siguiente serie: [portada]  TÍTULO                        │
└───────────────────────────────────────────────────────────┘
```

### Motion

- **Un momento orquestado en la home:** el nombre entra con SplitText (caracteres desde abajo con máscara, 0,8 s) y a continuación se dibujan los círculos rojos uno detrás de otro (trazo SVG, 0,5 s cada uno, escalonados).
- **Revelado:** de negro a imagen (brillo 0 → 1, contraste alto → normal, 0,8 s, `power2.out`). En capa 2 lo sustituye un shader (grano, viñeteo, desplazamiento de canales que se asienta).
- **Teletipo:** ~400 caracteres/s, cursor de bloque que desaparece al terminar. Solo la capa visual (`aria-hidden`); el texto accesible está entero desde el principio.
- **Hoja → serie:** View Transitions de Astro; el fotograma pulsado y la foto de destino comparten `view-transition-name` (asignado solo a esa pareja en el clic), así la imagen crece sin saltar.
- **Lupa (cuentahílos):** círculo de 220 px que amplía ×2,5 el fotograma bajo el cursor. Solo `pointer: fine` y ≥ 1024 px. `aria-hidden`.
- `prefers-reduced-motion: reduce` → sin SplitText, sin trazos animados (las marcas aparecen dibujadas), sin teletipo, sin lupa; transiciones de opacidad de 150 ms.
- Curvas: `power3.out` para entradas, `expo.inOut` para la transición de página. Un único sistema (GSAP).

## 3. Arquitectura

```
src/
  content.config.ts         esquema zod de series (pie y alt obligatorios ES/EN)
  content/series/<slug>/    index.md + fotos originales
  i18n/strings.ts           textos de interfaz ES/EN y rutas equivalentes
  layouts/Base.astro        <head>, SEO, hreflang, JSON-LD, ClientRouter, grano
  components/               ContactSheet, Frame, Caption, SiteHeader, LangSwitch…
  pages/                    ES en / ; EN en /en/
    index.astro · series/[slug].astro · editores.astro · sobre.astro · 404.astro
    en/index.astro · en/series/[slug].astro · en/editors.astro · en/about.astro
  scripts/
    app.ts                  ciclo de vida: init en astro:page-load, destroy en astro:before-swap
    capabilities.ts         detecta capa (0/1/2): WebGL2, reduced motion, ancho, núcleos, memoria
    smooth.ts               Lenis + ScrollTrigger en un único gsap.ticker (lagSmoothing(0))
    reveal.ts · teletype.ts · loupe.ts · marks.ts · sheet-keys.ts · transitions.ts
    webgl/                  (capa 2, import() dinámico tras el LCP; Three.js u OGL)
scripts/photos-check.mjs    revisa pies/alt/tamaño/autor EXIF y extrae paleta dominante
```

**Capas (mejora progresiva):**
- **Capa 0:** HTML semántico + CSS. Todas las fotos y pies se ven sin JS. La hoja se navega con Tab; los rollos son listas de enlaces.
- **Capa 1:** GSAP + ScrollTrigger + SplitText + Lenis. En móvil: sin Lenis (scroll nativo), sin lupa, revelado CSS, tira con `scroll-snap`. `/editores` no carga la capa 1 (solo 1 KB inline para «Copiar email»).
- **Capa 2:** WebGL solo si WebGL2 + sin reduced motion + ≥ 1024 px + `hardwareConcurrency ≥ 4` + (`deviceMemory ≥ 4` si existe). Se carga con `import()` después del LCP. Monitor de fps: < 45 durante 2 s → se apaga y vuelve a capa 1.

**i18n:** español en `/`, inglés en `/en/`. Equivalencias: `/editores` ↔ `/en/editors`, `/sobre` ↔ `/en/about`, `/series/x` ↔ `/en/series/x`. `hreflang` en todas.

**Por qué no Tailwind:** el sistema es pequeño y muy específico (película, perforaciones, marcas); con tokens CSS propios es más corto y no arrastra la paleta por defecto.

**Capa 2 — OGL (decidido):** OGL 1.0 en lugar de Three.js. El chunk `webgl-layer` pesa **18 KB gzip** (OGL + shaders + lógica); Three.js con renderer, texturas y planos ronda los 120 KB gzip o más (referencia habitual, no medida en este proyecto). Se carga con `import()` desde `motion-desktop` (53 KB gzip, que a su vez solo se carga en escritorio con puntero fino) y únicamente si `caps.webgl` y tras el LCP (PerformanceObserver + idle; 2,5 s de seguridad; en navegaciones con el router, en el primer momento ocioso).

- **Un canvas fijo** (`.gl-layer`, z-index 5, `pointer-events: none`, `aria-hidden`) y un plano por foto, posicionado cada frame con `getBoundingClientRect` dentro del mismo `gsap.ticker` que Lenis. Solo se dibuja cuando algo cambia (scroll, revelado, velocidad); en reposo no consume.
- **Revelado químico** (shader propio): de negro a imagen en 0,85 s; las luces emergen antes que las sombras en manchas irregulares (ruido), con contraste alto que se relaja, grano que se disipa, viñeteo que se abre y desplazamiento de canales RGB que se asienta. Con el plano listo, la `<img>` pasa a `opacity: 0` (sigue en el árbol de accesibilidad y el layout no cambia). En la home, al terminar el revelado el plano se libera y la foto vuelve al DOM (la lupa sigue en DOM).
- **Tira de película** (serie): los bordes del plano se arquean y se estiran levemente según `lenis.velocity` suavizada, con un leve desplazamiento RGB; vuelve a reposo al parar.
- **Fondo «mood»** (serie, en CSS por ser más barato): el `body` mezcla un 20 % del color más representativo de la foto en pantalla (`data-mood`, calculado en el build desde `src/data/palettes.json`) con el negro de cuarto oscuro. El contraste del texto se mantiene AA.
- **Monitor de fps:** media móvil; si baja de 45 durante 2 s (tras 1,2 s de calentamiento), las fotos vuelven al DOM con un fundido de 0,35 s, el canvas se desvanece y se destruye: queda la capa 1.
- **Ciclo de vida:** antes de navegar (`astro:before-preparation`) las fotos vuelven al DOM para que la View Transition capture la imagen real; en `astro:before-swap` se destruye todo (ticker, observers, texturas, `WEBGL_lose_context`, canvas).

## 4. Presupuestos

| Métrica | Límite |
|---|---|
| LCP | < 2,5 s (móvil simulado) |
| CLS | < 0,05 |
| INP | < 200 ms |
| JS inicial | < 90 KB gzip (sin Three.js/OGL) |
| Imagen de portada | < 250 KB |
| Sobredimensionado | ninguna foto > 2× el ancho de su hueco (`sizes` correctos) |
| Lighthouse | ≥ 90 en las cuatro categorías |

Se comprueban con `npm run check:budgets` (Lighthouse CI + medición de JS gzip) y fallan el build si se pasan.

## 5. Contenido pendiente (TODO visibles)

Fotos en alta, series reales (título, lugar, fecha, texto), pies de foto, bio 60–90 palabras, email/teléfono/Instagram, equipo y software (opcional), fotógrafos de referencia, dominio. Todo lo provisional está marcado como `[PROVISIONAL]` o `TODO` en pantalla y en el código.

## 6. Cambios tras las revisiones (diseño, accesibilidad, rendimiento)

- **Sin ScrollTrigger ni SplitText.** Todos los disparos por scroll (revelado, teletipo, marcas, contador, fondo mood) usan `IntersectionObserver`, así que ScrollTrigger solo añadía ~18 KB. El titular se parte en caracteres en el build (`SplitTitle.astro`: `aria-label` en el h1 y spans `aria-hidden`) y entra con una animación CSS cuyo estado inicial ya pinta: el LCP no depende del JS. GSAP queda para el ticker (un solo bucle con Lenis), `quickTo` de la lupa y los tweens de la capa 2. Chunk de escritorio: 53 → 33 KB gzip; escritorio total (inicial + escritorio) ≈ 42 KB.
- **Marcas con significado.** `selected` = círculo rojo en la hoja (1–2 por rollo; la principal con doble pasada). `featured` = sale en `/editores` (15). `mark: 'cross'` = cruz de lápiz blanco en un descarte (decorativa). El rojo solo significa «elegida»: el aviso provisional va en gris.
- **Círculo sobre el borde de la película**, sin tapar la foto. El grosor se fija en unidades del viewBox (≈ 2,5 px) en lugar de `vector-effect: non-scaling-stroke`, porque en Chrome ese ajuste rompe `pathLength`/`stroke-dasharray` y el trazo se dibuja a medias.
- **Hoja en tiras de 4** (2 tiras exactas por rollo de 8; 2 columnas en móvil), numeración del borde por rollo (`ARV 400 ▸5  5A`) y metadatos `MADRID / 03.2026 / 8 FOT.` (mayúsculas solo por CSS).
- **Revelado desde imagen latente**, no desde negro (CSS y shader), 0,55 s; con scroll rápido se revela sin animación. RGB mínimo y solo durante el revelado; arqueo de la tira 1,5 %; en reposo la `<img>` del DOM vuelve a mostrarse.
- **Capa 2 más ligera para INP:** un único `Program` compartido, una subida de textura por frame, `createImageBitmap` cuando existe; sondeo de WebGL2 una vez por sesión (con `loseContext`) y, si se apagó por fps, `sessionStorage['gl-off']` evita reintentarlo en la sesión.
- **Mood** solo con fotos que tienen color (max−min ≥ 0,25), al 8 % y con luminancia limitada: en B/N no cambia nada.
- **Grano estático** y por debajo del contenido (nunca encima de fotos de prensa).
- **Serie:** barra fina superior (`Rollo / título / 03/08 / Hoja de contactos`), que también hace de contador en móvil; foto + pie caben en pantalla; tira móvil con `role="region"`, nombre y `tabindex`; Escape y «volver» llevan a `/#fr-…` y enfocan el fotograma de la foto que se veía; tras la transición, foco en la figura de destino sin mover el scroll y el teletipo espera a que acabe.
- **CSS inline** (`build.inlineStylesheets: 'always'`): quita la petición de CSS que bloqueaba el render; sin empeorar LCP/CLS.
