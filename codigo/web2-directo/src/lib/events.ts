import { getCollection, type CollectionEntry } from 'astro:content';
import palettes from '../data/palettes.json';

export type Event = CollectionEntry<'eventos'>;
export type Photo = Event['data']['photos'][number];

/**
 * Secciones en orden editorial fijo (campo `order`): Fiesta Naranja, Supernoventeros, Más trabajos.
 * La foto de portada se mueve a la posición 0: así el setlist enlaza al evento sin ancla y la transición
 * lleva la portada del escenario a la primera foto de la galería.
 */
let cache: Event[] | null = null;
export async function getEvents(): Promise<Event[]> {
  if (cache) return cache;
  const all = await getCollection('eventos');
  for (const e of all) {
    const name = fileName({ file: e.data.cover });
    const i = e.data.photos.findIndex((p) => fileName(p) === name);
    if (i > 0) {
      const [c] = e.data.photos.splice(i, 1);
      e.data.photos.unshift(c);
    }
  }
  cache = all.sort((a, b) => a.data.order - b.data.order); // orden editorial fijo (campo order)
  return cache;
}

/** Texto a rotulador de un show: artista (o, si falta, el título sin la marca de provisional). */
export function showName(e: Event, lang: 'es' | 'en'): string {
  const a = lang === 'es' ? e.data.artist : e.data.artist_en ?? e.data.artist;
  return a ?? cleanTitle(lang === 'es' ? e.data.title : e.data.title_en).text;
}

export const photoId = (slug: string, i: number) => `${slug}--${String(i + 1).padStart(2, '0')}`;
export const anchor = (i: number) => `tema-${String(i + 1).padStart(2, '0')}`;
export const isPortrait = (p: Photo) => p.file.height > p.file.width;

/** Nombre del archivo original a partir de la ruta de Astro (…/01.abc123.jpg → 01.jpg) */
export function fileName(p: { file: { src: string } }): string {
  // fsPath (ruta del archivo fuente) no marca la imagen como usada; leer .src haría que Astro copiase el
  // ORIGINAL completo a dist/_astro aunque no se use (las fotos se sirven desde /fotos, ver lib/fotos.ts).
  const fs = (p.file as unknown as { fsPath?: string }).fsPath;
  if (fs) return fs.split('/').pop() ?? '';
  const base = p.file.src.split('?')[0].split('/').pop() ?? '';
  return base.replace(/^([^.]+)\.[^.]+\.(\w+)$/, '$1.$2');
}

/** Índice de la portada dentro de las fotos del evento (para anclar y transicionar). */
export function coverIndex(e: Event): number {
  const name = fileName({ file: e.data.cover });
  const i = e.data.photos.findIndex((p) => fileName(p) === name);
  return i < 0 ? 0 : i;
}

type Pal = Record<string, { dominant: string; palette: string[] }>;

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

/**
 * Gel de una foto: el color más saturado y luminoso de su paleta, empujado a una luz de escenario.
 * Devuelve HSL listo para CSS. Sin paleta → ámbar de luz de trabajo.
 */
export function gelFor(slug: string, file: string): string {
  const entry = (palettes as Pal)[`${slug}/${file}`];
  if (!entry) return 'hsl(35 85% 60%)';
  let best: [number, number, number] = [35, 0.85, 0.6];
  let score = -1;
  for (const hex of [entry.dominant, ...entry.palette]) {
    const [h, s, l] = hexToHsl(hex);
    const sc = s * Math.min(1, l * 3);
    if (sc > score) {
      score = sc;
      best = [h, s, l];
    }
  }
  if (score < 0.05) return 'hsl(35 85% 60%)';
  return `hsl(${Math.round(best[0])} 85% 60%)`;
}

/** Quita la marca [PROVISIONAL] del título para el rotulador; se muestra aparte. */
export function cleanTitle(t: string): { text: string; provisional: boolean } {
  const provisional = /^\s*\[PROVISIONAL\]\s*/i.test(t);
  return { text: t.replace(/^\s*\[PROVISIONAL\]\s*/i, ''), provisional };
}
