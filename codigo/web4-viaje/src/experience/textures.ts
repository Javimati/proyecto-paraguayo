import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, Texture, type WebGLRenderer } from 'three';

/**
 * Carga de texturas: fetch → createImageBitmap (decodifica fuera del hilo principal y voltea en origen)
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
    let tex: Texture;
    if (typeof createImageBitmap === 'function') {
      const res = await fetch(url, { signal: this.abort.signal });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
      tex = new Texture(bmp as unknown as HTMLImageElement);
      tex.flipY = false;
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      tex = new Texture(img);
    }
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
