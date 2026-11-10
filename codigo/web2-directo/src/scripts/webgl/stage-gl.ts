/**
 * Capa 2 — WebGL con OGL. Un único canvas fijo; cada plano se coloca sobre su <img>
 * (que pasa a opacity 0 pero sigue en el DOM: accesible y sin cambiar el layout).
 *
 * Regla: dentro del marco de una foto, píxeles fieles. La luz de escenario va fuera.
 *  · Home: la foto del show activo (fundido al cambiar) + un plano de luz a pantalla completa
 *    con haces del gel del show, bruma y derrame alrededor del marco. Al cambiar de show,
 *    UN destello breve fuera de la foto (como mucho uno cada 500 ms: ≤ 2 por segundo).
 *  · Evento: cada foto se enciende al entrar (desde brillo 0,6) y la velocidad de scroll
 *    produce un arrastre de obturación vertical que vuelve a nitidez al parar.
 *
 * Rendimiento: sin getBoundingClientRect por frame (posiciones cacheadas y recalculadas al
 * cambiar el layout) y texturas subidas de una en una, como mucho una por frame.
 * Monitor de fps: por debajo de ~45 fps durante 2 s se apaga solo, queda la capa 1 y no se
 * vuelve a intentar en la sesión.
 */
import { Renderer, Program, Mesh, Plane, Texture, Transform } from 'ogl';
import type { gsap as GSAP } from 'gsap';
import type Lenis from 'lenis';
import { STAGE_FRAG, HALO_FRAG, PHOTO_FRAG, VERT } from './shaders';
import { rememberGLOff } from '../capabilities';

interface Opts {
  page?: string;
  lenis: Lenis;
  gsap: typeof GSAP;
}

const FLASH_GAP = 500; // ms entre destellos (≤ 2 por segundo)
let lastFlash = 0;
function canFlash(): boolean {
  const now = performance.now();
  if (now - lastFlash < FLASH_GAP) return false;
  lastFlash = now;
  return true;
}

function parseHsl(v: string): [number, number, number] {
  const m = v.match(/hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/);
  if (!m) return [0.94, 0.65, 0.25];
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

async function decoded(img: HTMLImageElement): Promise<HTMLImageElement> {
  if (img.loading === 'lazy') img.loading = 'eager';
  try {
    await img.decode();
  } catch {
    /* si falla decode, igualmente se intenta subir */
  }
  return img;
}

export function initGL({ page, lenis, gsap }: Opts): () => void {
  const root = document.documentElement;
  const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5), alpha: true, antialias: true, premultipliedAlpha: false });
  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.classList.add('gl-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const scene = new Transform();
  const viewport = { w: innerWidth, h: innerHeight };
  const layoutFns: (() => void)[] = [];
  const relayout = () => layoutFns.forEach((f) => f());
  const resize = () => {
    viewport.w = innerWidth;
    viewport.h = innerHeight;
    renderer.setSize(viewport.w, viewport.h);
    relayout();
  };
  renderer.setSize(viewport.w, viewport.h);
  window.addEventListener('resize', resize);

  const cleanups: (() => void)[] = [];
  const updaters: ((t: number, dt: number) => void)[] = [];
  let alive = true;

  // Cola de subida de texturas: como mucho una por frame
  const uploads: (() => void)[] = [];
  const upload = (img: HTMLImageElement): Promise<Texture> =>
    new Promise((resolve) => {
      uploads.push(() => resolve(new Texture(gl, { image: img, generateMipmaps: false, minFilter: gl.LINEAR })));
    });

  /* ───────────── Home: foto fiel + luz alrededor ───────────── */
  if (page === 'home') {
    const list = document.querySelector<HTMLElement>('[data-setlist]');
    const shows = list ? Array.from(list.querySelectorAll<HTMLElement>('[data-show]')) : [];
    if (shows.length) {
      const imgs = shows.map((s) => s.querySelector<HTMLImageElement>('[data-stage-img] img')!);
      const gels = shows.map((s) => parseHsl(getComputedStyle(s).getPropertyValue('--gel')));
      const quad = new Plane(gl, { widthSegments: 1, heightSegments: 1 });
      const blank = new Texture(gl);
      let current = Math.max(0, shows.findIndex((s) => s.classList.contains('is-active')));

      const halo = new Program(gl, {
        vertex: VERT,
        fragment: HALO_FRAG,
        uniforms: {
          uRect: { value: [0, 0, 1, 1] },
          uViewport: { value: [1, 1] },
          uStage: { value: [0, 0, 1, 1] },
          uGel: { value: gels[current] },
          uTime: { value: 0 },
          uFlash: { value: 0 },
          uIntro: { value: 0 },
        },
        transparent: true,
        depthTest: false,
      });
      const haloMesh = new Mesh(gl, { geometry: quad, program: halo });
      haloMesh.renderOrder = 0;
      haloMesh.setParent(scene);

      const program = new Program(gl, {
        vertex: VERT,
        fragment: STAGE_FRAG,
        uniforms: {
          tCur: { value: blank },
          tPrev: { value: blank },
          uCurRes: { value: [3, 2] },
          uPrevRes: { value: [3, 2] },
          uRect: { value: [0, 0, 1, 1] },
          uViewport: { value: [1, 1] },
          uMix: { value: 1 },
          uIntro: { value: 0 },
        },
        transparent: false,
        depthTest: false,
      });
      const mesh = new Mesh(gl, { geometry: quad, program });
      mesh.renderOrder = 1;
      mesh.setParent(scene);
      mesh.visible = false;
      const textures: (Texture | null)[] = imgs.map(() => null);
      let ready = false;
      const u = program.uniforms;
      const h = halo.uniforms;

      // el escenario es fijo: su rectángulo solo cambia con el layout o el show activo
      const rect = [0, 0, 1, 1];
      const measure = () => {
        const box = shows[current].querySelector<HTMLElement>('[data-stage-img]');
        if (!box) return;
        const r = box.getBoundingClientRect();
        rect[0] = r.left;
        rect[1] = r.top;
        rect[2] = r.width;
        rect[3] = r.height;
      };
      layoutFns.push(measure);
      measure();

      const select = (i: number, flash: boolean) => {
        const tex = textures[i];
        if (!tex) return;
        u.tPrev.value = u.tCur.value;
        u.uPrevRes.value = u.uCurRes.value;
        u.tCur.value = tex;
        u.uCurRes.value = [imgs[i].naturalWidth || 3, imgs[i].naturalHeight || 2];
        gsap.to(h.uGel.value, { 0: gels[i][0], 1: gels[i][1], 2: gels[i][2], duration: 0.5, ease: 'power2.out', overwrite: true });
        gsap.fromTo(u.uMix, { value: 0 }, { value: 1, duration: 0.45, ease: 'power2.out', overwrite: true });
        if (flash && canFlash()) {
          gsap.fromTo(h.uFlash, { value: 1 }, { value: 0, duration: 0.45, ease: 'expo.out', overwrite: true });
        }
      };

      // primero la del show activo, luego el resto, de una en una
      const order = [current, ...imgs.map((_, i) => i).filter((i) => i !== current)];
      (async () => {
        for (const i of order) {
          const img = await decoded(imgs[i]);
          if (!alive) return;
          textures[i] = await upload(img);
          if (!alive) return;
          shows[i].querySelector('[data-stage-img]')?.setAttribute('data-gl', '');
          if (i === current && !ready) {
            ready = true;
            root.classList.add('gl-on');
            u.tPrev.value = textures[i]!;
            select(i, false);
            u.uMix.value = 1;
            gsap.fromTo([u.uIntro, h.uIntro], { value: 0 }, { value: 1, duration: 0.8, ease: 'power2.out' });
          }
        }
      })();

      const onChange = (e: Event) => {
        const i = (e as CustomEvent<{ index: number }>).detail.index;
        if (i === current) return;
        current = i;
        measure();
        if (ready && textures[i]) select(i, true);
      };
      list!.addEventListener('show:change', onChange);
      cleanups.push(() => list!.removeEventListener('show:change', onChange));

      updaters.push((t) => {
        if (!ready) {
          mesh.visible = false;
          return;
        }
        mesh.visible = rect[2] > 0;
        u.uRect.value = rect;
        u.uViewport.value = [viewport.w, viewport.h];
        h.uRect.value = [0, 0, viewport.w, viewport.h];
        h.uViewport.value = [viewport.w, viewport.h];
        h.uStage.value = rect;
        h.uTime.value = t;
      });
    }
  }

  /* ───────────── Evento: fotos con arrastre de obturación ───────────── */
  if (page === 'event') {
    const windows = Array.from(document.querySelectorAll<HTMLElement>('[data-gl-photo]'));
    const geometry = new Plane(gl, { widthSegments: 1, heightSegments: 1 });
    type P = { el: HTMLElement; img: HTMLImageElement; mesh: Mesh; prog: Program; loaded: boolean; revealed: boolean; box: number[] };
    const planes: P[] = [];
    windows.forEach((el) => {
      const img = el.querySelector('img')!;
      const prog = new Program(gl, {
        vertex: VERT,
        fragment: PHOTO_FRAG,
        uniforms: {
          tMap: { value: new Texture(gl) },
          uRect: { value: [0, 0, 1, 1] },
          uViewport: { value: [1, 1] },
          uVel: { value: 0 },
          uReveal: { value: 0 },
        },
        transparent: false,
        depthTest: false,
      });
      const mesh = new Mesh(gl, { geometry, program: prog });
      mesh.visible = false;
      mesh.setParent(scene);
      planes.push({ el, img, mesh, prog, loaded: false, revealed: false, box: [0, 0, 0, 0] });
    });

    // posiciones en coordenadas de documento; por frame solo se resta el scroll
    const measure = () => {
      const sy = scrollY;
      for (const p of planes) {
        const r = p.img.getBoundingClientRect();
        p.box[0] = r.left;
        p.box[1] = r.top + sy;
        p.box[2] = r.width;
        p.box[3] = r.height;
      }
    };
    layoutFns.push(measure);
    measure();
    const ro = new ResizeObserver(() => measure());
    const film = document.querySelector('[data-film]');
    if (film) ro.observe(film);
    cleanups.push(() => ro.disconnect());

    const reveal = (p: P) => {
      if (p.revealed) return;
      p.revealed = true;
      const instant = !p.el.hasAttribute('data-reveal') || p.el.classList.contains('no-anim');
      if (instant) {
        p.prog.uniforms.uReveal.value = 1;
        return;
      }
      gsap.to(p.prog.uniforms.uReveal, { value: 1, duration: 0.5, ease: 'power2.out' });
    };

    // Carga la textura cuando la foto se acerca; se enciende al entrar
    const near = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const p = planes.find((x) => x.el === en.target);
          if (!p || p.loaded) continue;
          near.unobserve(en.target);
          decoded(p.img)
            .then((img) => (alive ? upload(img) : Promise.reject()))
            .then((tex) => {
              if (!alive) return;
              p.prog.uniforms.tMap.value = tex;
              p.loaded = true;
              p.el.setAttribute('data-gl', '');
              measure();
              const top = p.box[1] - scrollY;
              if (top < innerHeight * 0.85 && top + p.box[3] > 0) reveal(p);
            })
            .catch(() => {});
        }
      },
      { rootMargin: '100% 0px' },
    );
    const enter = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const p = planes.find((x) => x.el === en.target);
          if (p?.loaded) {
            reveal(p);
            enter.unobserve(en.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    planes.forEach((p) => {
      near.observe(p.el);
      enter.observe(p.el);
    });
    root.classList.add('gl-on');
    cleanups.push(() => {
      near.disconnect();
      enter.disconnect();
    });

    let vel = 0;
    updaters.push(() => {
      const target = Math.max(-1, Math.min(1, (lenis.velocity || 0) / 60));
      vel += (target - vel) * 0.12;
      if (Math.abs(vel) < 0.002) vel = 0;
      const sy = scrollY;
      for (const p of planes) {
        if (!p.loaded) {
          p.mesh.visible = false;
          continue;
        }
        const top = p.box[1] - sy;
        const on = top + p.box[3] > -60 && top < viewport.h + 60 && p.box[2] > 0;
        p.mesh.visible = on;
        if (!on) continue;
        const u = p.prog.uniforms;
        u.uRect.value = [p.box[0], top, p.box[2], p.box[3]];
        u.uViewport.value = [viewport.w, viewport.h];
        u.uVel.value = vel;
      }
    });
  }

  /* ───────────── Bucle + monitor de fps ───────────── */
  // ?glforce desactiva el monitor de fps (solo para pruebas en máquinas lentas)
  const force = new URLSearchParams(location.search).has('glforce');
  let lowSince = 0;
  let ema = 60;
  let last = performance.now();
  let skipNext = true; // el primer frame y el de vuelta de una pestaña oculta no cuentan
  const onVis = () => {
    skipNext = true;
    lowSince = 0;
  };
  document.addEventListener('visibilitychange', onVis);
  const tick = (time: number) => {
    const now = performance.now();
    let dt = now - last;
    last = now;
    if (document.hidden || skipNext) {
      skipNext = false;
    } else if (dt > 0) {
      dt = Math.min(dt, 250); // se acota, no se descarta: por debajo de 4 fps también cuenta
      ema += (1000 / dt - ema) * 0.08;
      if (ema < 45 && !force) {
        if (!lowSince) lowSince = now;
        else if (now - lowSince > 2000) {
          console.info('[capa 2] fps bajos: vuelvo a la capa 1');
          rememberGLOff();
          destroy(true);
          return;
        }
      } else lowSince = 0;
    }
    const job = uploads.shift();
    if (job) job();
    for (const up of updaters) up(time, dt);
    renderer.render({ scene, sort: false });
  };
  gsap.ticker.add(tick);

  const destroy = (soft = false) => {
    if (!alive) return;
    alive = false;
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    cleanups.forEach((c) => c());
    uploads.length = 0;
    const finish = () => {
      root.classList.remove('gl-on');
      document.querySelectorAll('[data-gl]').forEach((el) => el.removeAttribute('data-gl'));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
    if (soft) {
      // vuelve a capa 1 sin que se note: las <img> reaparecen con un fundido y el canvas se va
      root.classList.add('gl-leaving');
      root.classList.remove('gl-on');
      canvas.style.transition = 'opacity 0.4s';
      canvas.style.opacity = '0';
      setTimeout(() => {
        finish();
        root.classList.remove('gl-leaving');
      }, 420);
    } else finish();
  };
  return () => destroy(false);
}
