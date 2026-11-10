# Web 4 — «El viaje» (contrato entre agentes)

Portfolio inmersivo de Álvaro Rodríguez Valverde (fotógrafo, 20 años, Arganda del Rey, 2º Grado Superior de
Iluminación, Captación y Tratamiento de Imagen en Campus FP Atocha). Foco: FOTORREPORTAJE + EVENTOS (conciertos,
fiestas, bodas). Cuenta su historia como fotógrafo y te hace viajar por sus fotos. Mucho hero motion, muy interactiva,
puede pesar más que las webs 1–3, pero la intro NO puede tardar: interactiva en < 2,5 s en escritorio normal.
Referencias del cliente: bricelab.dev (favorita: preloader HUD con %, «hold to enter», laboratorio 3D oscuro con luz
volumétrica, UI de HUD), bartniedbalski.com, franklinokolie.com, abelendeshaw.dev.
NO inventar datos de Álvaro (premios, clientes, fechas, anécdotas): lo pendiente como TODO visible.

## Concepto
**«A través del visor».** Toda la web es lo que ve Álvaro a través de su cámara.
1. INTRO (≤ 2,5 s hasta poder entrar; saltable con Esc/clic; una vez por sesión): visor electrónico de cámara
   (marcas de encuadre, puntos AF, lectura ISO / 1/250 / f2.8 / nº de disparos restantes que baja con la carga real
   de texturas). «MANTÉN PARA ENFOCAR»: mantener pulsado (ratón, espacio o dedo) enfoca la escena (desenfoque → nítido,
   los puntos AF se iluminan) y al soltar/llegar al 100 % suena (opcional, WebAudio sintetizado, desactivado por
   defecto) un obturador y un flash blanco breve (≤ 1 destello, nada de parpadeos) que da paso al viaje.
   Clic/Enter simple = entrada inmediata. Reduced motion = sin intro.
2. EL VIAJE (home): escena WebGL oscura y volumétrica; sus fotos flotan como grandes planos en el espacio
   (exposición nocturna iluminada por una linterna). El scroll mueve la cámara por una curva a través de CAPÍTULOS
   de su historia (Arganda / empezar · La calle · La noticia · El directo · Los eventos · Lo que viene) con tipografía
   cinética grande. Cursor = recuadro de enfoque AF que «engancha» la foto bajo el ratón (se encoge sobre ella, confirma
   el foco). Polvo en el haz de luz (partículas instanciadas) que reacciona al cursor. Clic en foto → la foto vuela al
   frente a pantalla completa (lightbox) con pie de agencia; ←/→ navega, Esc vuelve. Post-procesado sutil (grano,
   viñeta) que NUNCA altera el color de la foto en reposo. Botón fijo «Índice» → vista 2D plana instantánea de todo
   (para el editor con prisa) y enlace «Para editores».
3. FALLBACKS: sin JS / sin WebGL2 / reduced motion / gama baja → la misma historia en 2D (DOM) con todas las fotos,
   capítulos y pies, bonita y animada con CSS/GSAP ligero. Móvil: versión 3D reducida (menos planos, DPR ≤ 1,5, sin
   post) si hay WebGL2 y ≥ 4 núcleos; si no, 2D.

## Estructura de carpetas (proyecto Astro estático en /home/claude/alvaro-viaje)
- `src/content/fotos/<capitulo>/…` + `src/content.config.ts` (zod) → capítulos y fotos.
- `src/lib/viaje-data.ts` construye el JSON del contrato.
- `src/experience/` (agente 3D) — `mountExperience(opts)`.
- `src/intro/` (agente intro) — `mountIntro(opts)`.
- `src/scripts/caps.ts` — detección de gama (compartida; la escribe el agente shell).
- Páginas (agente shell): `/`, `/editores`, `/sobre`, `/contacto`, `/404`; EN en `/en/`, `/en/editors`, `/en/about`,
  `/en/contact`. `trailingSlash: 'always'`.

## Contrato de datos
En la home hay `<script type="application/json" id="viaje-data">` con:
```ts
type ViajeData = {
  lang: 'es' | 'en';
  labels: Record<string, string>;            // textos de interfaz (índice, cerrar, siguiente, mantén para enfocar…)
  chapters: {
    id: string; n: number;                   // 1..6
    kicker: string;                          // «Capítulo 02 — La calle»
    title: string;                           // título grande
    text: string;                            // 1–3 frases en primera persona (TODO/PROVISIONAL)
    photos: {
      id: string; src: string; srcSmall: string; // webp 1600 px y 640 px (rutas ya optimizadas por Astro)
      w: number; h: number; alt: string;
      caption: string;                       // pie completo «LUGAR, DD/MM/AAAA — texto (FOTO: Álvaro Rodríguez)»
      dominant: string;                      // '#rrggbb'
    }[];
  }[];
};
```
DOM de la home:
- `<main id="historia">`: la historia 2D completa (capa 0, SEO, sin JS). Siempre en el DOM.
- `<div id="viaje-root" aria-hidden="true">`: contenedor del canvas (fijo, pantalla completa).
- `<div id="viaje-ui">`: capa de interfaz (HUD, capítulo actual, botón Índice, lightbox accesible).
- `<div id="intro-root">`: capa de intro.

## APIs
```ts
// src/scripts/caps.ts
export type Tier = 'high' | 'mid' | 'low' | 'none';
export function detectTier(): Tier; // none = sin WebGL2 o reduced motion; low = móvil flojo → 2D

// src/experience/index.ts
export async function mountExperience(o: {
  root: HTMLElement; ui: HTMLElement; data: ViajeData; tier: Tier;
  onProgress?: (p: number) => void;          // 0..1 carga de texturas del primer capítulo
}): Promise<{ start(): void; destroy(): void }>;

// src/intro/index.ts
export function mountIntro(o: {
  root: HTMLElement; data: ViajeData; reduced: boolean;
  progress: { subscribe(cb: (p: number) => void): () => void }; // alimentado por onProgress
  onFocus?: (amount: number) => void;        // 0..1 mientras se mantiene pulsado (la escena se enfoca)
}): Promise<void>;                            // resuelve al entrar
```
Orquestación (agente shell, `src/scripts/home.ts`): detectTier → si ≥ mid, import() dinámico de experience e intro en
paralelo → la escena empieza a renderizar detrás de la intro (desenfocada) → al resolver la intro, `start()`.
Si tier none/low: sin intro WebGL; historia 2D con animaciones ligeras.

## Diseño (común)
Paleta oscura propia (no el cliché negro + verde ácido de bricelab ni ninguna de las webs 1–3), un acento.
Tipografías distintas de las webs 1–3 (Big Shoulders/Plex Mono, Permanent Marker/Archivo, Newsreader/Schibsted) y de
la lista prohibida (Inter, Roboto, Arial, Poppins, Montserrat, Space Grotesk, sistema). Autoalojadas, woff2 subset.
El agente shell fija los tokens en `src/styles/tokens.css` y los demás los usan.

## Fotos provisionales
Reutilizar las 49 fotos de muestra de /home/claude/alvaro-archivo/src/content (copiarlas, no moverlas), repartidas
en los 6 capítulos (calle→La calle, actualidad/manifestación/concentración→La noticia, concierto→El directo,
fiesta/boda→Los eventos, reportaje→Arganda/empezar o Lo que viene). Todo marcado PROVISIONAL.

## Presupuestos (relajados por petición del cliente, pero medidos)
- Shell + historia 2D: JS inicial < 60 KB gzip, LCP móvil < 2,5 s, CLS < 0,05, Lighthouse móvil ≥ 90 (la escena 3D
  no cuenta: se carga diferida).
- Experiencia: chunk 3D + intro < 350 KB gzip; texturas del primer capítulo < 2,5 MB; intro interactiva < 2,5 s;
  60 fps en gama alta, apagado/rebaja automática si < 40 fps.
- Accesibilidad AA: todo navegable con teclado (capítulos, fotos, lightbox), canvas aria-hidden, la historia DOM es la
  fuente accesible, sin destellos > 3/s, reduced motion respetado.
- Puertos de preview: shell 4400, experiencia 4410 (sandbox), intro 4420 (sandbox).
