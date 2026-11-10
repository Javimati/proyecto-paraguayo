/** Contrato de datos (ver CONTRACT.md). Tipado estructural: no depende del shell. */
export type Tier = 'high' | 'mid' | 'low' | 'none';

export interface ViajePhoto {
  id: string;
  src: string;
  srcSmall: string;
  w: number;
  h: number;
  alt: string;
  caption: string;
  dominant: string;
}

export interface ViajeChapter {
  id: string;
  n: number;
  kicker: string;
  title: string;
  text: string;
  photos: ViajePhoto[];
}

export interface ViajeData {
  lang: 'es' | 'en';
  labels: Record<string, string>;
  chapters: ViajeChapter[];
}

export interface MountOptions {
  root: HTMLElement;
  ui: HTMLElement;
  data: ViajeData;
  tier: Tier;
  /** 0..1 carga real de las texturas del primer capítulo */
  onProgress?: (p: number) => void;
  /** la capa 3D se ha apagado (fps bajos, contexto perdido): el shell debe mostrar la historia 2D */
  onFallback?: (reason: string) => void;
  /** capítulo activo (1..n), para sincronizar UI del shell */
  onChapter?: (n: number) => void;
  /** se abre / cierra el lightbox */
  onLightbox?: (open: boolean) => void;
}

export interface Experience {
  start(): void;
  destroy(): void;
  goToChapter(n: number): void;
  openPhoto(id: string): void;
  /** 0 = desenfocada (detrás de la intro) · 1 = nítida */
  setFocus(amount: number): void;
}
