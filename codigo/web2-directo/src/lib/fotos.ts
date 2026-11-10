/**
 * Fotos a calidad nativa: URLs de las versiones que genera scripts/build-photos.mjs
 * (JPEG 95, color 4:4:4, hasta 3200 px + el original). Mantener FOTO_WIDTHS igual que WIDTHS allí.
 */
import { fileName } from './events';

export const FOTO_WIDTHS = [640, 800, 1080, 1280, 1600, 2000, 2400, 3200];

export interface Foto {
  src: string;
  srcset: string;
  original: string;
  width: number;
  height: number;
}

export function foto(slug: string, img: { src: string; width: number; height: number }): Foto {
  const base = fileName({ file: img }).replace(/\.jpe?g$/i, '');
  const dir = `/fotos/${slug}/${base}`;
  const ws = FOTO_WIDTHS.filter((w) => w < img.width);
  const original = `${dir}-original.jpg`;
  const parts = ws.map((w) => `${dir}-${w}.jpg ${w}w`);
  parts.push(`${original} ${img.width}w`); // el original entra en el srcset: solo se usa si la pantalla lo pide
  const mid = ws.includes(1600) ? 1600 : ws[ws.length - 1];
  return { src: mid ? `${dir}-${mid}.jpg` : original, srcset: parts.join(', '), original, width: img.width, height: img.height };
}
