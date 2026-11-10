/**
 * Capa 2 — WebGL (OGL). Un único canvas fijo y UN único Program compartido; cada foto es una
 * malla con sus propios valores (se cargan en onBeforeRender).
 * - Home: revela los fotogramas y devuelve cada uno al DOM al terminar (la lupa sigue en DOM).
 * - Serie: revela y arquea levemente la tira con la velocidad de Lenis; en reposo, la <img>
 *   del DOM vuelve a mostrarse (el plano solo se ve mientras hay algo que hacer).
 * - Texturas: una subida por frame, desde ImageBitmap cuando el navegador lo permite (INP).
 * - Si los fps caen por debajo de ~45 durante 2 s, se apaga para toda la sesión y queda la capa 1.
 * Las <img> se ocultan con opacity (siguen en el árbol de accesibilidad y el layout no cambia).
 */
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture } from 'ogl';
import type { gsap as GSAP } from 'gsap';
import type Lenis from 'lenis';
import { vertex, fragment } from './shaders';
import { markGLOff } from '../capabilities';

interface Opts {
  gsap: typeof GSAP;
  lenis: Lenis;
  page?: string;
}

interface Item {
  win: HTMLElement;
  img: HTMLImageElement;
  mesh?: Mesh;
  texture?: Texture;
  source?: ImageBitmap | HTMLImageElement;
  preparing: boolean;
  progress: { v: number };
  seed: number;
  visible: boolean;
  revealing: boolean;
  persistent: boolean; // serie: la malla se queda para la deformación
  released: boolean;
  onGL: boolean; // la <img> está oculta y se ve el plano
}

const REVEAL_S = 0.55;
const FPS_FLOOR = 45;
const FPS_WINDOW_MS = 2000;
const VEL_EPS = 0.004;
const FAST_SCROLL = 0.6; // velocidad normalizada a partir de la cual se revela sin animación

export function initGL({ gsap, lenis, page }: Opts): () => void {
  const isSeries = page === 'series';
  const isHome = page === 'home';
  const winSel = isSeries ? '.shot__window' : isHome ? '.frame__window' : '';
  if (!winSel) return () => {};

  const canvas = document.createElement('canvas');
  canvas.className = 'gl-layer';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer: Renderer;
  try {
    renderer = new Renderer({
      canvas,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      alpha: true,
      premultipliedAlpha: false,
      depth: false,
      antialias: true,
      powerPreference: 'high-performance',
      webgl: 2,
    });
  } catch {
    return () => {};
  }
  const gl = renderer.gl;
  if (!(gl instanceof WebGL2RenderingContext)) return () => {};
  gl.clearColor(0, 0, 0, 0);
  document.body.append(canvas);
  document.documentElement.classList.add('gl');

  const camera = new Camera(gl);
  const scene = new Transform();
  const geometry = new Plane(gl, { widthSegments: isSeries ? 16 : 1, heightSegments: isSeries ? 8 : 1 });

  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let dirty = true;
  let alive = true;
  let velocity = 0;
  let lastScroll = window.scrollY;
  const t0 = performance.now();
  let time = 0;

  // ── Un único Program: los valores de cada malla se cargan justo antes de dibujarla ──
  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: false,
    cullFace: false,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tMap: { value: null },
      uRect: { value: [0, 0, 1, 1] },
      uViewport: { value: [vw, vh] },
      uImage: { value: [1, 1] },
      uPlane: { value: [1, 1] },
      uProgress: { value: 1 },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uSeed: { value: 0 },
    },
  });
  const u = program.uniforms;

  const resize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh);
    dirty = true;
  };

  const items: Item[] = [];
  const uploadQueue: Item[] = [];

  const showGL = (it: Item, on: boolean) => {
    if (it.onGL === on) return;
    it.onGL = on;
    it.win.classList.toggle('gl-on', on);
    if (it.mesh) it.mesh.visible = on && it.visible;
    dirty = true;
  };

  // Prepara la fuente de la textura fuera del bucle (ImageBitmap decodifica fuera del hilo principal)
  const prepare = async (it: Item) => {
    if (it.source || it.preparing || it.released) return;
    it.preparing = true;
    try {
      if (!it.img.complete || !it.img.naturalWidth) await it.img.decode();
      it.source =
        'createImageBitmap' in window ? await createImageBitmap(it.img, { imageOrientation: 'flipY' }) : it.img;
    } catch {
      it.source = undefined; // si no decodifica, se queda en DOM
    }
    it.preparing = false;
    if (alive && it.source && !it.released) uploadQueue.push(it);
  };

  // Una textura nueva por frame, como mucho
  const pumpUpload = () => {
    const it = uploadQueue.shift();
    if (!it || it.released || !it.source || it.mesh) return;
    const isBitmap = typeof ImageBitmap !== 'undefined' && it.source instanceof ImageBitmap;
    const texture = new Texture(gl, {
      image: it.source as HTMLImageElement,
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      flipY: !isBitmap, // el ImageBitmap ya viene volteado
    });
    const mesh = new Mesh(gl, { geometry, program });
    mesh.onBeforeRender(() => {
      const r = it.img.getBoundingClientRect();
      u.tMap.value = texture;
      u.uRect.value = [r.left, r.top, r.width, r.height];
      u.uPlane.value = [r.width, r.height];
      u.uImage.value = [it.img.naturalWidth, it.img.naturalHeight];
      u.uProgress.value = it.progress.v;
      u.uSeed.value = it.seed;
      u.uVelocity.value = velocity;
      u.uTime.value = time;
      u.uViewport.value = [vw, vh];
    });
    mesh.setParent(scene);
    mesh.visible = false;
    it.mesh = mesh;
    it.texture = texture;
    // En la home el plano se muestra ya (va a revelar); en la serie, solo si hay revelado o movimiento
    if (isHome || it.progress.v < 1 || velocity !== 0) showGL(it, true);
    dirty = true;
  };

  const release = (it: Item) => {
    // devuelve la foto al DOM y libera la GPU
    it.released = true;
    showGL(it, false);
    if (it.mesh) it.mesh.setParent(null);
    if (it.texture?.texture) gl.deleteTexture(it.texture.texture);
    if (typeof ImageBitmap !== 'undefined' && it.source instanceof ImageBitmap) it.source.close();
    it.mesh = undefined;
    it.texture = undefined;
    it.source = undefined;
    dirty = true;
  };

  const finishReveal = (it: Item) => {
    it.revealing = false;
    it.progress.v = 1;
    if (!it.persistent) release(it);
    else if (velocity === 0) showGL(it, false); // en reposo, la foto vuelve al DOM
    dirty = true;
  };

  const reveal = (it: Item) => {
    if (it.revealing || it.progress.v >= 1) return;
    it.win.classList.add('is-revealed', 'no-anim'); // el CSS de capa 1 queda resuelto
    // Con scroll muy rápido no hay tiempo de verlo (o la textura no llegó): sin animación
    if (Math.abs((lenis.velocity || 0) / 45) > FAST_SCROLL || !it.mesh) {
      finishReveal(it);
      return;
    }
    it.revealing = true;
    showGL(it, true);
    gsap.to(it.progress, {
      v: 1,
      duration: REVEAL_S,
      ease: 'power2.out',
      onUpdate: () => (dirty = true),
      onComplete: () => finishReveal(it),
    });
  };

  // ── Recoge las fotos ──
  document.querySelectorAll<HTMLElement>(winSel).forEach((win) => {
    const img = win.querySelector('img');
    if (!img) return;
    const already = !win.hasAttribute('data-reveal') || win.classList.contains('is-revealed');
    const it: Item = {
      win,
      img,
      progress: { v: already ? 1 : 0 },
      seed: Math.random(),
      visible: false,
      revealing: false,
      persistent: isSeries,
      released: false,
      onGL: false,
      preparing: false,
    };
    // En la home, lo que ya está revelado no necesita plano: se queda en DOM
    if (isHome && already) it.released = true;
    items.push(it);
  });

  // Visibilidad (con margen para preparar texturas antes de que entren)
  const visIO = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const it = items.find((i) => i.win === en.target);
        if (!it) continue;
        it.visible = en.isIntersecting;
        if (it.mesh) it.mesh.visible = it.visible && it.onGL;
        if (it.visible) prepare(it);
      }
      dirty = true;
    },
    { rootMargin: '300px 0px' },
  );
  // Disparo del revelado: mismo criterio que la capa 1. Si la textura aún no está, espera un poco.
  const revealIO = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const it = items.find((i) => i.win === en.target);
        if (!it) continue;
        revealIO.unobserve(en.target);
        const t = performance.now();
        const wait = () => {
          if (!alive) return;
          if (it.mesh || performance.now() - t > 400) reveal(it);
          else requestAnimationFrame(wait);
        };
        prepare(it);
        wait();
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
  );
  items.forEach((it) => {
    if (it.released) return;
    visIO.observe(it.win);
    if (it.progress.v < 1) revealIO.observe(it.win);
  });

  // ── Fondo "mood" en la serie: solo fotos con color de verdad (data-mood viene del build) ──
  let moodIO: IntersectionObserver | null = null;
  if (isSeries) {
    document.body.classList.add('mood-on');
    moodIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const c = (en.target as HTMLElement).dataset.mood;
          if (c) document.body.style.setProperty('--mood', c);
          else document.body.style.removeProperty('--mood');
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    document.querySelectorAll<HTMLElement>('.shot__window').forEach((el) => moodIO!.observe(el));
  }

  // ── Bucle (gsap.ticker, el mismo que Lenis) ──
  let slowSince = 0;
  let lastFrame = 0;
  let lastTick = 0;
  let fpsAvg = 60;
  // Solo para pruebas automáticas con renderizado por software (swiftshader)
  const noGuard = (window as Window & { __glNoFpsGuard?: boolean }).__glNoFpsGuard === true;

  const tick = () => {
    if (!alive) return;
    const now = performance.now();
    pumpUpload();

    // velocidad de scroll suavizada → vuelve a reposo al parar
    const target = isSeries ? Math.max(-1, Math.min(1, (lenis.velocity || 0) / 45)) : 0;
    const prev = velocity;
    // suavizado independiente de los fps
    const k = 1 - Math.pow(0.88, Math.min(now - (lastTick || now), 100) / 16.7 || 1);
    lastTick = now;
    velocity += (target - velocity) * k;
    if (Math.abs(velocity) < VEL_EPS && Math.abs(target) < VEL_EPS) velocity = 0;

    if (isSeries && (prev === 0) !== (velocity === 0)) {
      // empieza o termina el movimiento: el plano entra o la <img> del DOM vuelve
      const moving = velocity !== 0;
      for (const it of items) if (it.mesh && !it.revealing) showGL(it, moving);
    }

    const sy = window.scrollY;
    if (sy !== lastScroll) {
      lastScroll = sy;
      dirty = true;
    }
    if (velocity !== 0) dirty = true;
    if (!dirty) {
      lastFrame = 0; // en reposo no medimos fps
      return;
    }
    dirty = false;
    time = (now - t0) / 1000;
    renderer.render({ scene, camera, clear: true });

    // Monitor de fps (solo mientras hay trabajo)
    if (lastFrame) {
      const dt = now - lastFrame;
      fpsAvg += (1000 / Math.max(dt, 1) - fpsAvg) * 0.1;
      if (fpsAvg < FPS_FLOOR && now - t0 > 1200 && !noGuard) {
        if (!slowSince) slowSince = now;
        else if (now - slowSince > FPS_WINDOW_MS) bailOut();
      } else slowSince = 0;
    }
    lastFrame = now;
  };
  gsap.ticker.add(tick);

  // La transición de página captura el DOM: antes de navegar, las fotos vuelven a verse
  const beforeNav = () => {
    items.forEach((it) => {
      it.win.classList.remove('gl-on');
      if (it.progress.v > 0 && it.progress.v < 1) it.win.classList.add('is-revealed', 'no-anim');
    });
    canvas.style.opacity = '0';
  };
  document.addEventListener('astro:before-preparation', beforeNav);

  const ro = new ResizeObserver(resize);
  ro.observe(document.documentElement);
  resize();

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    alive = false;
    gsap.ticker.remove(tick);
    visIO.disconnect();
    revealIO.disconnect();
    moodIO?.disconnect();
    ro.disconnect();
    document.removeEventListener('astro:before-preparation', beforeNav);
    items.forEach((it) => {
      gsap.killTweensOf(it.progress);
      // a medio revelar → se resuelve; sin empezar → lo revelará la capa 1 (CSS)
      if (it.progress.v > 0 && it.progress.v < 1) it.win.classList.add('is-revealed', 'no-anim');
      if (!it.released) release(it);
    });
    program.remove?.();
    document.body.classList.remove('mood-on');
    document.body.style.removeProperty('--mood');
    document.documentElement.classList.remove('gl');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  }

  // Apagado suave por rendimiento: fotos al DOM con fundido, canvas fuera, sin reintentos en la sesión
  let bailing = false;
  function bailOut() {
    if (destroyed || bailing) return;
    bailing = true;
    markGLOff();
    gsap.ticker.remove(tick);
    document.documentElement.classList.add('gl-bailout');
    items.forEach((it) => {
      gsap.killTweensOf(it.progress);
      if (it.progress.v > 0 && it.progress.v < 1) it.win.classList.add('is-revealed', 'no-anim');
      it.win.classList.remove('gl-on'); // las <img> vuelven con fundido (CSS)
    });
    canvas.style.opacity = '0';
    setTimeout(destroy, 400);
    console.info('[capa 2] fps bajos: vuelvo a la capa 1 durante esta sesión');
  }

  return destroy;
}
