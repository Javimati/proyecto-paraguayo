# PLAN — Álvaro Rodríguez · Directo (web 2)

Portfolio de **directo**: conciertos, festivales, salas, fiestas y club, eventos (bodas en segundo plano). Lector principal: **promotor, sala, agencia de comunicación o banda** que abre el enlace desde un correo o un DM, mira 30 segundos y decide. Hermana de la web de fotoperiodismo, pero con identidad propia.

## 1. Concepto: «Setlist / luz de escenario»

- **La home es el setlist.** Una hoja de papel pegada con cinta americana al suelo del escenario. Cada línea, escrita a rotulador, es un show. Debajo, en letra de ficha técnica: sala, ciudad, fecha, hora.
- **Apagan la sala.** Al pasar el ratón (o con el foco del teclado) por una línea, el resto de la hoja se apaga y en el escenario —a la derecha— aparece la foto de ese show bañada por la luz de gel de su propia paleta. Funciona en CSS (`:hover`, `:focus-within`, `:has()`), sin JS.
- **Cañón de seguimiento.** En escritorio, un círculo de luz sigue al cursor sobre la foto del escenario (es el equivalente a la lupa de la web 1: decorativo, `aria-hidden`).
- **El bis.** Después del último show, el setlist dice «Bis»: ahí están «Para promotores» y «Sobre mí». La navegación secundaria es parte de la metáfora.
- **Cada foto es un tema.** En la página del evento, un contador fijo `Tema 03/08` dice dónde estás.
- **Crónica, no galería.** Pie con formato de crónica: `SALA, CIUDAD, DD/MM/AAAA — Texto. (FOTO: Álvaro Rodríguez)`.
- **404: «Se fue la luz».** Escenario a oscuras con la *ghost light* (la bombilla desnuda que los teatros dejan encendida).

**Vueltas sobre el punto de partida:**
1. El color de acento no es fijo: cada show trae su gel, calculado de su propia foto (`src/data/palettes.json`). La web cambia de luz con cada concierto, como una sala.
2. La navegación de bis integrada en el setlist evita un menú genérico de «trabajos».
3. Pies a la derecha de la foto en escritorio (columna de crónica) en vez de debajo: distinto de la web 1 y la foto ocupa toda la altura.
4. Fotosensibilidad: el «flash de estroboscopio» es **un único destello que se asienta** por cambio de foto, nunca más de 2 por segundo, y desaparece con `prefers-reduced-motion`.

## 2. Sistema de diseño

### Color

| Token | Hex | Uso |
|---|---|---|
| `--escenario` | `#1b1a1d` | Suelo del escenario: fondo general |
| `--escenario-apagado` | `#0e0d10` | Sala apagada (hover en el setlist) |
| `--papel` | `#f4f4f1` | Hoja del setlist y página de promotores |
| `--rotulador` | `#18171a` | Texto sobre papel |
| `--cinta` | `#8f8d88` | Cinta americana |
| `--sala` | `#ecebe7` | Texto sobre oscuro |
| `--meta` | `#a8a5a0` | Metadatos sobre oscuro (AA) |
| `--meta-papel` | `#55524d` | Metadatos sobre papel (AA) |
| `--luz-trabajo` | `#f0a640` | Foco del teclado y enlace activo (luz de trabajo ámbar) |
| `--gel` | dinámico | Luz de cada show, calculada de su paleta (saturada) |

Sin degradados decorativos: los únicos degradados son luz (haces, cañón de seguimiento).

### Tipografía (autoalojada, woff2, subset latino, `font-display: swap`)

- **Permanent Marker** — solo el setlist y las anotaciones a mano (títulos de cada show en la home, «Bis», 404). Es literalmente la letra de rotulador de un setlist de escenario; fuera de ese papel no aparece.
- **Archivo Variable** (ejes `wght` 100–900 y `wdth` 62–125) — todo lo demás. Una sola familia con tres voces: **extendida y negra** (wdth 125, wght 850) para títulos de evento, como un cartel de gira; **condensada** (wdth 72) para la ficha técnica (sala, ciudad, fecha), como una entrada; **normal** para texto y pies.

Escala (1,25): 12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · fluida `clamp(2.75rem, 7.5vw, 7.5rem)` para títulos de evento. Alineación a la izquierda. ≤ 70 caracteres por línea.

### Retícula

12 columnas, margen `clamp(16px, 4vw, 56px)`, hueco 16 px.

```
HOME (escritorio)
┌──────────────────────────────────────────────────────────────┐
│ ÁLVARO RODRÍGUEZ — DIRECTO — MADRID                ES/EN     │
│ ┌──cinta──┐          ┌──cinta──┐                              │
│ │ ÁLVARO RODRÍGUEZ   │  ┌────────────── escenario ─────────┐ │
│ │ setlist · directo  │  │                                   │ │
│ │                    │  │  foto del show activo, con gel    │ │
│ │ CONCIERTO EN SALA  │  │  + cañón de seguimiento           │ │
│ │  Sala, Madrid 14.03│  │                                   │ │
│ │ FESTIVAL …         │  └───────────────────────────────────┘ │
│ │ NOCHE DE CLUB …    │   título · sala · ciudad (aria-hidden) │
│ │ ── BIS ──          │                                        │
│ │ Para promotores    │                                        │
│ │ Sobre mí           │                                        │
│ └────────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
cols 1–5 setlist (girado −1,2°) · cols 6–12 escenario (sticky)

EVENTO
┌──────────────────────────────────────────────────────────────┐
│ ← Setlist                                      Concierto     │
│ CONCIERTO EN SALA   (Archivo extendida negra)                 │
│ SALA DE PRUEBA · MADRID · 14.03.2026 · 22:30 (condensada)     │
│ ┌──────────── foto (cols 1–9) ───────────┐  pie de crónica   │
│ └────────────────────────────────────────┘  (cols 10–12)     │
│ …                                                 Tema 03/08 │
└──────────────────────────────────────────────────────────────┘
```

Móvil: setlist a ancho completo con la portada de cada show bajo su línea; en el evento, tira horizontal con `scroll-snap` y pie debajo.

### Motion

- **Momento orquestado (home):** las líneas del setlist se «escriben» una a una (máscara de izquierda a derecha, 0,35 s por línea, escalonadas). CSS puro.
- **Evento:** el título sube como un telón (SplitText por caracteres con máscara). Las fotos «se encienden» al entrar (de sala apagada con gel a luz normal, 0,8 s).
- **Hoja → evento:** View Transitions; la portada del escenario y la foto de destino comparten `view-transition-name`.
- **Cañón de seguimiento:** `gsap.quickTo` sobre variables CSS, solo puntero fino ≥ 1024 px.
- **Capa 2 (WebGL, OGL):** escenario con haces volumétricos suaves y bloom contenido; cambio de foto con un destello de estroboscopio que se asienta (máx. 2/s); en el evento, arrastre de obturación vertical proporcional a la velocidad de Lenis que vuelve a nitidez al parar; luz ambiente con el gel de cada foto.
- `prefers-reduced-motion`: sin escritura, sin telón, sin destellos, sin cañón, sin WebGL; transiciones de opacidad de 150 ms.

## 3. Arquitectura

Igual que la web 1 (infraestructura compartida): Astro estático, content collection `eventos` con esquema zod (pie y alt obligatorios ES/EN), `src/i18n/strings.ts`, `Base.astro` con SEO/hreflang/JSON-LD, `ClientRouter`, scripts con ciclo de vida `astro:page-load` / `astro:before-swap`.

```
src/scripts/
  app.ts            núcleo ligero (también en móvil): reveal, contador, Escape, view transitions
  capabilities.ts   capa 0/1/2
  motion-desktop.ts import() en escritorio: GSAP + ScrollTrigger + SplitText + Lenis + cañón
  webgl/            import() tras el LCP: OGL + shaders (escenario, evento), monitor de fps
```

- **OGL en vez de Three.js:** la capa 2 son planos con shaders propios; OGL cubre eso con una fracción del peso (ver §4). Three no aporta nada aquí.
- **Sin Tailwind:** tokens CSS propios.
- `/para-promotores` sin router ni capa 1 (≈ 1 KB de JS inline para «Copiar email»).

## 4. Presupuestos

LCP < 2,5 s · CLS < 0,05 · INP < 200 ms · JS inicial < 90 KB gzip (sin la capa WebGL) · imagen de portada < 250 KB · ninguna foto > 2× su hueco · Lighthouse ≥ 90 en las 4 categorías. `npm run check:budgets`.

Pesos medidos: JS inicial ≈ 9 KB gzip por página (1,5 KB en promotores); escritorio (GSAP + ScrollTrigger + SplitText + Lenis) ≈ 53 KB con import(); capa WebGL (OGL + shaders) ≈ 18 KB con import() tras el LCP. Detalle en el README.

## Cambios tras la revisión (diseño + accesibilidad/rendimiento)

- **Fidelidad de la foto:** dentro del marco, píxeles fieles. Fuera el baño de gel, el brillo, la viñeta y el cañón de seguimiento (también el `soft-light` en CSS). La luz de escenario (haces con el gel, bruma, derrame y el destello ≤ 2/s) va en un plano WebGL a pantalla completa con el marco recortado.
- **Setlist:** cada línea es el artista (campo `artist`, hoy `[Banda] TODO`…, sin inventar nombres), con número de tema en el margen y ficha «Sala, Ciudad · 14.03.26». Orden cronológico descendente. Escrito en ≈1 s. Ya no se oscurece el papel: luz de trabajo cálida sobre la línea activa y solo los títulos inactivos al 55 %. Inicio/Fin en el teclado.
- **Setlist → evento sin ancla:** la portada pasa a ser `photos[0]` y la transición la lleva a la primera foto; se aterriza en la cabecera y el foco va al título.
- **Evento:** resguardo de setlist (papel con cinta, nombre a rotulador, ficha condensada), fondo neutro fijo `#161616`, el gel solo en el borde del contador «Tema 03/08». Encendido desde brillo 0,6 en 0,5 s. Arrastre de obturación sin curvar el marco. Pie sin repetir sala/fecha si coinciden con el evento.
- **Móvil:** tira con scroll-snap como región accesible (`role=region`, `tabindex=0`), contador visible, sin fotos apagadas. Cabecera en una línea.
- **JS:** fuera ScrollTrigger, SplitText y el cañón de seguimiento (`motion-desktop` 33 KB gzip, WebGL 18 KB). Sondeo WebGL una vez por sesión con `loseContext`; el apagado por fps se recuerda en `sessionStorage`; sin `getBoundingClientRect` por frame; texturas de una en una.
- **Fuentes:** Archivo partida en texto (wght 400–650, wdth 72–100, 42,7 KB) + cartel estático 850/125 (10,2 KB); Permanent Marker solo mayúsculas/cifras (14,2 KB, `font-display: optional`, precargada donde se usa). Respaldos métricos por ancho.
- **SEO:** `trailingSlash: 'always'` y rutas con barra final; 404 con `noindex` y sin canonical/hreflang. CSS en línea.
