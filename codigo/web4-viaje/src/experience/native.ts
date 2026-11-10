/**
 * Capa nativa: cuando la cámara está quieta delante de una foto (o en el lightbox), encima del lienzo WebGL se
 * pone la FOTO REAL como <img> del navegador, con srcset (cada pantalla recibe su densidad real) y encajada a
 * píxel físico de pantalla. Así lo que se ve en reposo es la imagen nativa, no una textura reescalada dentro
 * de un lienzo con densidad limitada.
 *
 * La foto 3D sigue debajo (mismo encuadre); la capa solo aparece con la imagen ya decodificada y se quita al
 * instante en cuanto la cámara se mueve.
 */
import type { ViajePhoto } from './types';

export interface Quad {
  /** esquinas en píxeles CSS: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda */
  x: [number, number, number, number];
  y: [number, number, number, number];
}

const CSS = `
.vx-native{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;contain:strict}
.vx-native img{position:absolute;left:0;top:0;display:block;max-width:none;transform-origin:0 0;opacity:0;
  user-select:none;-webkit-user-drag:none;backface-visibility:hidden}
`;

export class NativeLayer {
  readonly el: HTMLDivElement;
  private img: HTMLImageElement;
  private id: string | null = null;
  private ready = false;
  private alpha = 0;
  private sizesPx = 0;
  private last = '';

  constructor(parent: HTMLElement) {
    if (!document.getElementById('vx-native-css')) {
      const st = document.createElement('style');
      st.id = 'vx-native-css';
      st.textContent = CSS;
      document.head.append(st);
    }
    this.el = document.createElement('div');
    this.el.className = 'vx-native';
    this.el.setAttribute('aria-hidden', 'true');
    this.img = document.createElement('img');
    this.img.alt = '';
    this.img.decoding = 'async';
    this.img.draggable = false;
    this.el.append(this.img);
    parent.append(this.el);
  }

  /** prepara la foto (antes de que haga falta, para que esté decodificada al llegar) */
  set(photo: ViajePhoto | null, cssWidth: number) {
    const id = photo?.id ?? null;
    // `sizes` = ancho real en pantalla: el navegador elige la versión ≥ ancho × densidad de píxeles
    const want = Math.ceil(cssWidth / 16) * 16;
    if (id === this.id && (want <= this.sizesPx || !photo)) return;
    if (!photo || !photo.srcset) {
      this.id = null;
      this.ready = false;
      this.img.removeAttribute('srcset');
      this.img.removeAttribute('src');
      return;
    }
    const same = id === this.id;
    this.id = id;
    this.sizesPx = want;
    if (!same) {
      this.ready = false;
      this.alpha = 0;
      this.img.style.opacity = '0';
    }
    this.img.sizes = `${want}px`;
    if (!same) {
      this.img.srcset = photo.srcset;
      this.img.src = photo.src;
    }
    const img = this.img;
    img
      .decode()
      .then(() => {
        if (this.id === id && img.srcset === photo.srcset) this.ready = true;
      })
      .catch(() => {
        /* se queda la foto 3D */
      });
  }

  get photoId() {
    return this.id;
  }

  /** visible = la cámara está quieta y la foto está entera en su sitio. Devuelve la opacidad actual. */
  update(q: Quad | null, visible: boolean, dt: number): number {
    const target = visible && this.ready && q ? 1 : 0;
    // entra suave (0,2 s) y sale casi al instante (0,06 s) para no ir nunca por detrás de la cámara
    const k = target > this.alpha ? dt / 0.2 : dt / 0.06;
    this.alpha = target > this.alpha ? Math.min(target, this.alpha + k) : Math.max(target, this.alpha - k);
    if (this.alpha <= 0.001 || !q) {
      if (this.last !== 'hidden') {
        this.img.style.opacity = '0';
        this.img.style.visibility = 'hidden';
        this.last = 'hidden';
      }
      return 0;
    }
    const dpr = window.devicePixelRatio || 1;
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    const minX = Math.min(...q.x), maxX = Math.max(...q.x), minY = Math.min(...q.y), maxY = Math.max(...q.y);
    // ¿rectángulo alineado con la pantalla? (foto paralela al plano de cámara) → encaje a píxel físico exacto
    const dev = Math.max(
      Math.abs(q.x[0] - q.x[3]),
      Math.abs(q.x[1] - q.x[2]),
      Math.abs(q.y[0] - q.y[1]),
      Math.abs(q.y[3] - q.y[2]),
    );
    let css: string;
    if (dev * dpr < 0.9) {
      const x0 = snap(minX), y0 = snap(minY);
      const w = snap(maxX) - x0, h = snap(maxY) - y0;
      css = `w:${w};h:${h};t:translate(${x0}px,${y0}px)`;
      if (css !== this.last) {
        this.img.style.width = `${w}px`;
        this.img.style.height = `${h}px`;
        this.img.style.transform = `translate(${x0}px,${y0}px)`;
      }
    } else {
      // en perspectiva (solo mientras entra/sale): homografía exacta del rectángulo a las 4 esquinas
      const w = Math.max(1, Math.round(maxX - minX)), h = Math.max(1, Math.round(maxY - minY));
      css = `p:${q.x.join(',')}:${q.y.join(',')}`;
      if (css !== this.last) {
        this.img.style.width = `${w}px`;
        this.img.style.height = `${h}px`;
        this.img.style.transform = homography(q, w, h);
      }
    }
    this.img.style.visibility = 'visible';
    this.img.style.opacity = this.alpha >= 0.999 ? '1' : this.alpha.toFixed(3);
    this.last = css;
    return this.alpha;
  }

  destroy() {
    this.el.remove();
  }
}

/** matrix3d que lleva el rectángulo (0,0)-(w,h) a las cuatro esquinas del cuadrilátero */
function homography(q: Quad, w: number, h: number): string {
  const [x0, x1, x2, x3] = q.x;
  const [y0, y1, y2, y3] = q.y;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, d, e, g, hh;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) {
    g = 0;
    hh = 0;
  } else {
    g = (dx3 * dy2 - dx2 * dy3) / den;
    hh = (dx1 * dy3 - dx3 * dy1) / den;
  }
  a = x1 - x0 + g * x1;
  b = x3 - x0 + hh * x3;
  d = y1 - y0 + g * y1;
  e = y3 - y0 + hh * y3;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`;
}
