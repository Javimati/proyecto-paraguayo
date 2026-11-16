import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, Texture, type WebGLRenderer } from 'three';

/**
 * Carga de texturas: <img> + decode() (decodifica fuera del hilo principal), foto DERECHA (fila 0 = arriba), sin volteo en la subida
 * con concurrencia limitada, y subida a GPU de una en una por frame para no dar tirones.
 * Las texturas van SIN conversión de espacio de color: los píxeles llegan a pantalla tal cual.
 */
type Job = { url: string; priority: number; resolve: (t: Texture) => void; reject: (e: unknown) => void };

export class TextureLoader {
  private queue: Job[] = [];
  private active = 0;
  private uploads: Texture[] = [];
  private cache = new Map<string, Promise<Texture>>();
  private textures = new Set<Texture>();
  private disposed = false;
  private abort = new AbortController();

  constructor(
    private renderer: WebGLRenderer,
    private maxConcurrent = 3,
    private anisotropy = 4,
  ) {}

  load(url: string, priority = 0): Promise<Texture> {
    const hit = this.cache.get(url);
    if (hit) return hit;
    const p = new Promise<Texture>((resolve, reject) => {
      this.queue.push({ url, priority, resolve, reject });
      this.queue.sort((a, b) => a.priority - b.priority);
      this.pump();
    });
    this.cache.set(url, p);
    return p;
  }

  /** cambia la prioridad de lo que aún no se ha empezado a descargar (menor = antes) */
  reprioritize(fn: (url: string) => number) {
    for (const j of this.queue) j.priority = fn(j.url);
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  private pump() {
    while (!this.disposed && this.active < this.maxConcurrent && this.queue.length) {
      const job = this.queue.shift()!;
      this.active++;
      this.fetchOne(job.url)
        .then((tex) => {
          if (this.disposed) {
            tex.dispose();
            return;
          }
          this.textures.add(tex);
          this.uploads.push(tex);
          job.resolve(tex);
        })
        .catch((e) => job.reject(e))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private async fetchOne(url: string): Promise<Texture> {
    // SIEMPRE con <img> (la ruta estándar de WebGL), nunca createImageBitmap. Con ImageBitmap, Chrome de Android
    // subía al azar algunas fotos boca abajo (espejo vertical exacto, medido en la captura de Marlon, 16/11/2026):
    // según el móvil la imagen puede quedar en GPU y el origen de la subida cambia. Safari además convertía el color.
    if (this.abort.signal.aborted) throw new DOMException('aborted', 'AbortError');
    const img = new Image();
    img.decoding = 'async';
    const onAbort = () => img.removeAttribute('src');
    this.abort.signal.addEventListener('abort', onAbort, { once: true });
    img.src = url;
    try {
      await img.decode();
    } finally {
      this.abort.signal.removeEventListener('abort', onAbort);
    }
    const tex = new Texture(img);
    // TODAS las texturas de foto, derechas y sin voltear en la subida (ni ImageBitmap ni UNPACK_FLIP_Y): el volteo
    // lo hace siempre el shader, igual en todos los navegadores
    tex.flipY = false;
    tex.colorSpace = NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = LinearMipmapLinearFilter;
    tex.magFilter = LinearFilter;
    tex.anisotropy = this.anisotropy;
    tex.needsUpdate = true;
    return tex;
  }

  /** llamar una vez por frame: sube como mucho una textura a la GPU */
  tick() {
    const t = this.uploads.shift();
    if (t) this.renderer.initTexture(t);
  }

  /** libera una textura grande que ya no hace falta (vuelve a la pequeña) para no acumular memoria de GPU */
  release(url: string) {
    const p = this.cache.get(url);
    if (!p) return;
    this.cache.delete(url);
    const i = this.queue.findIndex((j) => j.url === url);
    if (i >= 0) {
      this.queue.splice(i, 1)[0].reject(new Error('released'));
      return;
    }
    p.then((t) => {
      this.textures.delete(t);
      const k = this.uploads.indexOf(t);
      if (k >= 0) this.uploads.splice(k, 1);
      const img = t.image as { close?: () => void } | undefined;
      t.dispose();
      img?.close?.();
    }).catch(() => {});
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.queue.length = 0;
    for (const t of this.textures) {
      const img = t.image as { close?: () => void } | undefined;
      t.dispose();
      img?.close?.();
    }
    this.textures.clear();
    this.cache.clear();
  }
}
