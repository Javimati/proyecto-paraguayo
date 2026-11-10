# PLAN — Web 4 «A través del visor»

Portfolio inmersivo de Álvaro Rodríguez Valverde: fotorreportaje y eventos. Contrato entre agentes en `CONTRACT.md`
(manda sobre este plan en APIs y estructura). Este documento fija el diseño del shell, la historia 2D y las páginas.

## 1. Concepto afinado

Todo es lo que ve Álvaro por el visor. La interfaz es un visor electrónico (EVF): marcas de encuadre en las esquinas,
lecturas técnicas en monoespaciada (ISO, velocidad, diafragma, disparos restantes), y un único color de acento: el
**amarillo de *focus peaking***, el color con el que las cámaras marcan lo que está a foco. En esta web el amarillo
significa siempre lo mismo: «esto está enfocado / esto es lo activo».

- **Gama alta/media:** intro de visor → viaje 3D por capítulos (agentes intro y experiencia).
- **Gama baja, sin WebGL2, sin JS o reduced motion:** la misma historia en 2D (`#historia`), que es el contenido real,
  indexable y accesible, y que tiene que ser bonita por sí sola: no es un «plan B» feo.
- **Editor con prisa:** botón «Índice» siempre visible y página `/editores` sin efectos.

Revisión contra clichés (antes de construir):
- *Negro + acento ácido* (cliché 2) y bricelab (negro + lima): evitado. El acento es amarillo cálido y tiene un
  significado técnico concreto (peaking), y el fondo no es negro neutro sino un azul noche muy oscuro de pantalla
  apagada.
- *Mono para etiquetas pequeñas* (cliché 5): aquí está justificado, porque reproduce las lecturas del EVF y el pie de
  agencia. A cambio, nada de eyebrows en mayúsculas sobre cada titular: los capítulos llevan una sola línea de lectura
  técnica, en caja mixta.
- *Nombre gigante centrado en el hero* (prohibido por el cliente): el hero es una FOTO dentro del visor, con el
  nombre pequeño en la lectura del visor y el titular con lo que hace, no quién es.

## 2. Tokens (`src/styles/tokens.css`)

| Token | Hex | Uso |
|---|---|---|
| `--noche` | `#0a0b10` | Fondo: pantalla de visor apagada |
| `--pantalla` | `#12141b` | Superficies del HUD (barra de cabecera, lightbox) |
| `--linea` | `#2a2e39` | Marcas de encuadre, filetes |
| `--texto` | `#ebe8e0` | Texto principal (blanco cálido, 16,5:1 sobre `--noche`) |
| `--tenue` | `#9ea2ab` | Metadatos y lecturas (7,6:1) |
| `--peaking` | `#ffe14d` | Único acento: foco, enlace activo, AF confirmado, anillo de foco (14:1) |

**Tipografía** (autoalojada, subset Latin-1, `font-display: swap`, generada con `scripts/make-fonts.py`):
- **Bricolage Grotesque** (variable wght 200–800, 34 KB): titulares y texto. Grotesca con *ink traps* y algo de
  rugosidad de cartel callejero; a peso 780 con interletra negativa da titulares de capítulo con mucha presencia, y a 400
  es muy legible en texto corrido. No se ha usado en las webs 1–3.
- **Martian Mono** (400/500, 7 KB cada una): lecturas del visor, pies de agencia, contador de capítulo. Es una mono
  ancha y técnica que parece salida de la pantalla de una cámara, no de un editor de código.

Escala (1,25 en texto, saltos grandes en display): 12 · 13 · 15 · 17 (cuerpo) · 21 · 27 · 34 · 43 ·
`clamp(3.2rem, 11vw, 11rem)` (titular de capítulo). Medida de lectura ≤ 62 caracteres.

## 3. Retícula y composición

12 columnas, margen `clamp(16px, 4vw, 64px)`, hueco 20 px. Texto alineado a la izquierda.

```
HERO (100svh)                                   CAPÍTULO
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────┐
│⌜ ISO 400  1/250  f/2.8          [049] ⌝ │     │ 02/06  La calle                           │
│                                          │     │ LA CALLE (enorme, Bricolage 780)          │
│        ┌──── foto en el visor ────┐      │     │                 texto (cols 7–12)         │
│        │      [  AF  ]            │      │     │ ┌──── foto ancha (1–12) ────────────────┐ │
│        └──────────────────────────┘      │     │ └───────────────────────────────────────┘ │
│ Fotorreportaje y eventos.                │     │ pie mono                                  │
│ Madrid — Álvaro Rodríguez Valverde       │     │      ┌─ foto (5–11) ─┐   ┌ vertical (1–4)┐ │
│⌞ Desliza                               ⌟│     │      └───────────────┘   └───────────────┘ │
└──────────────────────────────────────────┘     └──────────────────────────────────────────┘
ÍNDICE DE CAPÍTULOS: tira de 6 portadas numeradas (es una secuencia real: capítulos 01–06)
CIERRE: «Busco prácticas desde el 16/02/2027» + email copiable + teléfono + /editores
```

Ritmo de fotos dentro de cada capítulo (patrón que se repite cada 4): ancha 1–12 · 6–12 · 1–5 vertical/media ·
3–10. Las verticales nunca se recortan.

## 4. Motion

- **2D:** un solo gesto, la **apertura de diafragma**: cada foto se revela con un `clip-path` que se abre desde el
  centro (inset → 0) acoplado al scroll (`animation-timeline: view()`, CSS puro, sin JS). Donde no hay soporte, las fotos
  están simplemente visibles. Las marcas AF (esquinas amarillas) aparecen al pasar el ratón o enfocar con teclado.
  Con `prefers-reduced-motion: reduce` no hay ninguna animación.
- **3D e intro:** ver `CONTRACT.md` (agentes experiencia e intro).

## 5. Arquitectura

```
src/content.config.ts        capítulos (colección «fotos», zod: pie y alt obligatorios ES/EN)
src/content/fotos/NN-slug/   index.md + fotos
src/lib/viaje-data.ts        capítulos ordenados + imágenes optimizadas (640/1000/1600 webp) → JSON del contrato
src/i18n/strings.ts          textos de interfaz, datos de contacto reales, rutas ES/EN
src/scripts/caps.ts          detectTier()
src/scripts/home.ts          orquestación: tier → import() de experience + intro → start()
src/layouts/Base.astro       head, SEO, hreflang, JSON-LD, cabecera HUD, pie
src/components/              Historia (2D), Photo, Header, Footer, EditorsPage, AboutPage, ContactPage
src/experience/  src/intro/  (otros agentes)
```

Sin router de Astro: la experiencia es pesada y vive solo en la home; entre páginas hay navegación normal (más simple
y sin fugas de contextos WebGL).

## 6. Accesibilidad con la experiencia activa

- `#historia` es la fuente accesible. Cuando la experiencia 3D está activa, `#historia` se oculta visualmente y queda
  `inert` (fuera del orden de tabulación) para que nadie tabule por contenido invisible.
- El **primer** elemento enfocable de la página es «Ver la historia en texto e imágenes» (enlace de salto): lo activa
  la vista 2D (quita `inert`, oculta y destruye el canvas) y lleva el foco al inicio de la historia. El botón «Índice»
  hace lo mismo desde la cabecera, con `aria-pressed`.
- La capa `#viaje-ui` (agente experiencia) ofrece navegación por teclado entre capítulos y fotos y un lightbox
  accesible (`role="dialog"`, foco atrapado, Esc).
- El canvas es `aria-hidden`; la intro se salta con Esc/Enter/clic y no existe con reduced motion.
- Se recuerda la preferencia 2D en `sessionStorage['vista-2d']`.

## 7. Presupuestos (ver CONTRACT.md)

Shell + historia 2D: JS inicial < 60 KB gzip; LCP móvil < 2,5 s; CLS < 0,05; Lighthouse móvil ≥ 90 en `/`,
`/editores`, `/en/`. Experiencia + intro: < 350 KB gzip diferidos (medidos aparte por `npm run check:js`).

## 8. Datos reales incluidos (del cliente)

Email alvadar2@gmail.com · teléfono 660 458 606 · prácticas desde el 16/02/2027 hasta completar 440 h, horario el que
asigne la empresa · acepta empresas sin convenio previo con el centro · Lightroom Classic y Photoshop · inglés B1 ·
sin carné, transporte público · referente: Alex Webb (le gusta su foto de niños mexicanos jugando en un patio).
Sin Instagram ni PDF: los botones de descarga no se muestran mientras no haya archivo.
Pendiente (TODO visible): fotos reales, pies, bio, cámara/objetivos, PDF, dominio.
