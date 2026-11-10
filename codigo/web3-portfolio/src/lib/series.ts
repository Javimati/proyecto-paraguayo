import { getCollection, type CollectionEntry } from 'astro:content';
import palettes from '../data/palettes.json';
import { SECTION_ORDER, type Section } from '../i18n/strings';

export type Series = CollectionEntry<'series'>;
export type Photo = Series['data']['photos'][number];

export async function getSeries(): Promise<Series[]> {
  const all = await getCollection('series');
  return all.sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.data.section) - SECTION_ORDER.indexOf(b.data.section) || a.data.order - b.data.order,
  );
}

export async function bySection(): Promise<{ section: Section; series: Series[] }[]> {
  const all = await getSeries();
  return SECTION_ORDER.map((section) => ({ section, series: all.filter((s) => s.data.section === section) })).filter(
    (g) => g.series.length,
  );
}

export function photoId(slug: string, index: number): string {
  return `${slug}--${String(index + 1).padStart(2, '0')}`;
}
export function anchor(index: number): string {
  return `f-${String(index + 1).padStart(2, '0')}`;
}
export function isPortrait(p: Photo): boolean {
  return p.file.height > p.file.width;
}
function fileName(p: Photo): string {
  return (p.file.src.split('/').pop() ?? '').split('?')[0].replace(/\.[^.]+\.(jpe?g|png|webp)$/i, '.$1');
}

/** Color ambiente de proyección: el dominante de la foto, oscurecido hasta casi negro. */
export function ambient(slug: string, index: number, photo: Photo): string {
  const key = `${slug}/${String(index + 1).padStart(2, '0')}.jpg`;
  const entry = (palettes as Record<string, { dominant: string; palette: string[] }>)[key];
  const hex = entry?.palette?.find((c) => saturation(c) > 0.18) ?? entry?.dominant ?? '#222222';
  void photo;
  return mix(hex, '#0c0d0f', 0.8);
}
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function saturation(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}
function mix(a: string, b: string, t: number): string {
  const A = rgb(a),
    B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join('');
}
export { fileName };

/**
 * Número de archivo ESTABLE de cada foto: orden global fijo (apartado → serie → foto),
 * el mismo en la mesa, en /trabajo, en /encargos y en cualquier otra página.
 */
let _archive: Map<string, number> | null = null;
export async function archiveNumber(slug: string, index: number): Promise<number> {
  if (!_archive) {
    _archive = new Map();
    let n = 0;
    for (const s of await getSeries()) s.data.photos.forEach((_, i) => _archive!.set(photoId(s.id, i), ++n));
  }
  return _archive.get(photoId(slug, index)) ?? 0;
}

/** Fecha corta de montura: 01.05.26 */
export function mountDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${String(d.getUTCFullYear()).slice(2)}`;
}
