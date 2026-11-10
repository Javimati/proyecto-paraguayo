/**
 * Capa 2 (WebGL, OGL). Un único canvas y un único Program; un plano por foto, sincronizado con el DOM.
 *  - mesa:  dibuja las fotos de las diapositivas con píxeles fieles (sin grano, viñeteo, desenfoque
 *           ni separación de canales); la geometría (giro, elevación, escala) la calcula mesa.ts.
 *  - serie: revelado de entrada como fundido de exposición y curvatura muy leve según la velocidad.
 * Una foto de prensa no se altera: el efecto vive en la geometría y en la entrada, nunca en la imagen.
 * Texturas ligeras (400 px), solo de las fotos visibles o cercanas, subidas de una en una por frame.
 * Monitor de fps: por debajo de ~45 durante 2 s se apaga sin que se note, queda la capa 1 y se recuerda.
 */
import { Renderer, Program, Mesh, Plane, Texture } from 'ogl';
import { gsap } from 'gsap';
import type Lenis from 'lenis';
import type { MesaApi } from '../mesa';
import { rememberGLOff } from '../capabilities';
import { vertex, fragment } from './shaders';

interface Opts {
  page?: string;
  mesa: MesaApi | null;
  lenis: Lenis | null;
}

interface GLItem {
  img: HTMLImageElement;
  holder: HTMLElement;
  tex: Texture;
  state: 'idle' | 'loading' | 'decoded' | 'ready' | 'error';
  source: ImageBitmap | HTMLImageElement | null;
  aspect: number;
  reveal: number;
  revealed: boolean;
  mesaIndex: number;
}

export function startGL({ page, mesa, lenis }: Opts): () => void {
  const root = document.documentElement;
  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
  });
  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'gl-canvas';
  Object.assign(canvas.style, {
    position: page === 'home' ? 'absolute' : 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: page === 'home' ? '2' : '1',
    opacity: '1',
    transition: 'opacity .4s ease',
  });
  const host = page === 'home' ? document.querySelector<HTMLElement>('[data-mesa]')! : document.body;
  host.appendChild(canvas);

  const geometry = new Plane(gl, { width: 1, height: 1, widthSegments: page === 'series' ? 24 : 1, heightSegments: 1 });
  const program = new Program(gl, {
    vertex,
    fragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tMap: { value: null },
      uRes: { value: [1, 1] },
      uCenter: { value: [0, 0] },
      uSize: { value: [1, 1] },
      uRot: { value: 0 },
      uBend: { value: 0 },
      uImgAspect: { value: 1.5 },
      uAlpha: { value: 1 },
      uReveal: { value: 1 },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  let dead = false;

  // ── Fotos ──
  const items: GLItem[] = [];
  if (page === 'home' && mesa) {
    mesa.items.forEach((it, i) => items.push(makeItem(it.img, it.el, i, true)));
  } else {
    document.querySelectorAll<HTMLElement>('[data-gl-photo]').forEach((holder) => {
      const img = holder.querySelector('img');
      // ya revelada en el DOM (primera foto, destino de la transición o ya vista): sin segundo revelado
      const shown = !holder.hasAttribute('data-reveal') || holder.classList.contains('is-in');
      if (img) items.push(makeItem(img, holder, -1, shown));
    });
  }

  function makeItem(img: HTMLImageElement, holder: HTMLElement, mesaIndex: number, preRevealed: boolean): GLItem {
    const tex = new Texture(gl, { generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR });
    return { img, holder, tex, state: 'idle', source: null, aspect: 1.5, reveal: preRevealed ? 1 : 0, revealed: preRevealed, mesaIndex };
  }

  /** Pide la textura (decodificada fuera del hilo principal cuando se puede). */
  function request(g: GLItem) {
    if (g.state !== 'idle') return;
    g.state = 'loading';
    const src = g.img.dataset.tex || g.img.currentSrc || g.img.src;
    const done = (s: ImageBitmap | HTMLImageElement, w: number, h: number) => {
      if (dead) return;
      g.source = s;
      g.aspect = w / h;
      g.state = 'decoded';
      mesa?.invalidate(200);
    };
    const fail = () => (g.state = 'error');
    if ('createImageBitmap' in window) {
      fetch(src)
        .then((r) => r.blob())
        // ImageBitmap ignora UNPACK_FLIP_Y (por especificación): se voltea al decodificar
        .then((b) => createImageBitmap(b, { imageOrientation: 'flipY' }))
        .then((bmp) => done(bmp, bmp.width, bmp.height), fail);
    } else {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
      im.decode().then(() => done(im, im.naturalWidth, im.naturalHeight), fail);
    }
  }

  /** Sube como mucho UNA textura por frame (evita tareas largas al aparecer muchas a la vez). */
  function uploadOne() {
    const g = items.find((i) => i.state === 'decoded');
    if (!g || !g.source) return;
    g.tex.image = g.source as HTMLImageElement;
    g.tex.update();
    g.state = 'ready';
  }

  // ── Tamaño ──
  let vw = 0,
    vh = 0;
  const resize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    program.uniforms.uRes.value = [vw, vh];
    mesa?.invalidate(200);
  };
  resize();
  window.addEventListener('resize', resize);
  root.classList.add('webgl');

  // Si el navegador pierde el contexto, las fotos vuelven al DOM al instante
  const onLost = (e: Event) => {
    e.preventDefault();
    fallback();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  // ── Velocidad (serie) ──
  let bend = 0;
  let lastScroll = window.scrollY;

  // ── Monitor de fps (solo cuenta frames seguidos: en reposo la mesa no dibuja) ──
  let activeTime = 0,
    activeFrames = 0,
    lastDraw = 0,
    slow = 0;
  const started = performance.now();
  const guard = !(window as unknown as { __GL_NO_FPS_GUARD?: boolean }).__GL_NO_FPS_GUARD;

  const u = program.uniforms;
  const draw = () => {
    if (dead) return;
    const now = performance.now();
    const dt = now - lastDraw;
    lastDraw = now;
    if (dt < 100) {
      activeTime += dt;
      activeFrames++;
      if (activeTime >= 500) {
        const fps = (activeFrames * 1000) / activeTime;
        activeTime = activeFrames = 0;
        if (guard && now - started > 1500) {
          slow = fps < 45 ? slow + 1 : 0;
          if (slow >= 4) {
            fallback();
            return;
          }
        }
      }
    }
    uploadOne();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (page === 'home' && mesa) {
      const S = mesa.size();
      for (const g of items) {
        const it = mesa.items[g.mesaIndex];
        const half = S * it.scale;
        const near = it.cx > -half * 2 && it.cx < vw + half * 2 && it.cy > -half * 2 && it.cy < vh + half * 2;
        if (!near) continue;
        request(g);
        if (g.state !== 'ready') continue;
        // descartadas por el filtro: ni fantasma GL (la montura ya está casi transparente)
        if (it.alpha < 0.5) {
          g.holder.classList.remove('gl-on');
          continue;
        }
        // durante la caída de la intro la foto la pinta el DOM, unida a su montura
        if (it.drop < 0.999) {
          g.holder.classList.remove('gl-on');
          continue;
        }
        g.holder.classList.add('gl-on');
        u.tMap.value = g.tex;
        u.uCenter.value = [it.cx, it.cy];
        u.uSize.value = [it.winW * it.scale, it.winH * it.scale];
        u.uRot.value = (it.rot * Math.PI) / 180;
        u.uImgAspect.value = g.aspect;
        u.uAlpha.value = 1;
        u.uReveal.value = 1;
        u.uBend.value = 0;
        mesh.draw();
      }
    } else {
      const v = lenis ? lenis.velocity : window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      // curvatura máxima 1,1 %: se nota el movimiento, la foto no se deforma
      bend += (gsap.utils.clamp(-0.011, 0.011, v * 0.00045) - bend) * 0.12;
      if (Math.abs(bend) < 0.0002) bend = 0;
      for (const g of items) {
        const r = g.holder.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
        request(g);
        if (g.state !== 'ready') continue;
        if (r.bottom < -50 || r.top > vh + 50) continue;
        g.holder.classList.add('gl-on');
        if (!g.revealed && r.top < vh * 0.88) {
          g.revealed = true;
          gsap.to(g, { reveal: 1, duration: 0.8, ease: 'power2.out' });
        }
        u.tMap.value = g.tex;
        u.uCenter.value = [r.left + r.width / 2, r.top + r.height / 2];
        u.uSize.value = [r.width, r.height];
        u.uRot.value = 0;
        u.uImgAspect.value = g.aspect;
        u.uAlpha.value = 1;
        u.uReveal.value = g.reveal;
        u.uBend.value = bend;
        mesh.draw();
      }
    }
  };

  let unFrame: (() => void) | null = null;
  if (mesa) {
    unFrame = mesa.onFrame(draw);
    mesa.invalidate(400);
  } else gsap.ticker.add(draw);

  function teardown() {
    if (dead) return;
    dead = true;
    unFrame?.();
    gsap.ticker.remove(draw);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', onLost);
    items.forEach((g) => {
      gsap.killTweensOf(g);
      g.holder.classList.remove('gl-on');
      if (g.tex.texture) gl.deleteTexture(g.tex.texture);
      if (g.source && 'close' in g.source) (g.source as ImageBitmap).close();
    });
    root.classList.remove('webgl');
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** Vuelve a la capa 1 sin salto: primero aparecen las <img>, después se va el canvas. Se recuerda. */
  function fallback() {
    if (dead) return;
    rememberGLOff();
    console.info('[capa 2] fps bajos o contexto perdido: vuelvo a la capa 1');
    items.forEach((g) => g.holder.classList.remove('gl-on'));
    canvas.style.opacity = '0';
    setTimeout(teardown, 450);
    unFrame?.();
    gsap.ticker.remove(draw);
  }

  return teardown;
}
