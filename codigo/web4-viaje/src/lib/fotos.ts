/**
 * Fotos a calidad nativa: URLs de las versiones que genera scripts/build-photos.mjs
 * (JPEG 95, color 4:4:4, hasta 3200 px + el original byte a byte).
 * Mantener FOTO_WIDTHS igual que WIDTHS en scripts/build-photos.mjs.
 */
export const FOTO_WIDTHS = [320, 480, 640, 800, 1080, 1280, 1600, 2000, 2400, 3200];

export interface Foto {
  /** versión por defecto (1600 px o la mayor disponible) */
  src: string;
  /** 480 px (texturas lejanas del viaje, fondo de la intro) */
  small: string;
  srcset: string;
  /** todas las versiones, de menor a mayor, con su ancho real; la última es el original */
  variants: [number, string][];
  original: string;
  width: number;
  height: number;
}

type Img = { src: string; width: number; height: number; fsPath?: string };

/** Nombre del archivo fuente (01.jpg). Se lee fsPath y NO .src: leer .src haría que Astro copiase el original
 *  completo a dist/_astro aunque no se use (las fotos se sirven desde /fotos). */
export function sourceName(img: Img): string {
  if (img.fsPath) return img.fsPath.split('/').pop() ?? '';
  const base = img.src.split('?')[0].split('/').pop() ?? '';
  return base.replace(/^([^.]+)\.[^.]+\.(\w+)$/, '$1.$2');
}

/** chapterDir = carpeta del capítulo (01-desde-madrid) */
export function foto(chapterDir: string, img: Img): Foto {
  const base = sourceName(img).replace(/\.(jpe?g|png|webp|tiff?)$/i, '');
  const dir = `/fotos/${chapterDir}/${base}`;
  const ws = FOTO_WIDTHS.filter((w) => w < img.width);
  const original = `${dir}-original.jpg`;
  const variants: [number, string][] = ws.map((w) => [w, `${dir}-${w}.jpg`]);
  variants.push([img.width, original]); // el original entra en el srcset: solo se usa si la pantalla lo pide
  const mid = ws.includes(1600) ? 1600 : ws[ws.length - 1];
  return {
    src: mid ? `${dir}-${mid}.jpg` : original,
    // textura lejana del viaje 3D y fondo desenfocado de la intro: 480 px (de cerca se carga la versión justa)
    small: ws.includes(480) ? `${dir}-480.jpg` : ws.length ? `${dir}-${ws[ws.length - 1]}.jpg` : original,
    srcset: variants.map(([w, u]) => `${u} ${w}w`).join(', '),
    variants,
    original,
    width: img.width,
    height: img.height,
  };
}
