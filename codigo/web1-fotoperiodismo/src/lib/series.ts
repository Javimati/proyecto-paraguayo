import { getCollection, type CollectionEntry } from 'astro:content';

export type Series = CollectionEntry<'series'>;
export type Photo = Series['data']['photos'][number];

export async function getSeries(): Promise<Series[]> {
  const all = await getCollection('series');
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Id estable de una foto: se usa para anclas (#f-03) y para la transición hoja → serie. */
export function photoId(slug: string, index: number): string {
  return `${slug}--${String(index + 1).padStart(2, '0')}`;
}
export function anchor(index: number): string {
  return `f-${String(index + 1).padStart(2, '0')}`;
}

export function isPortrait(p: Photo): boolean {
  return p.file.height > p.file.width;
}

/** Trazo de lápiz graso: elipse temblorosa que se pasa de vuelta, determinista por semilla. */
export function greaseCircle(seed: number, rxBase = 50, ryBase = 34): string {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const cx = 50,
    cy = 33;
  const rx = rxBase + rnd() * 2,
    ry = ryBase + rnd() * 2;
  const start = -Math.PI * (0.55 + rnd() * 0.3);
  const turns = 1.08 + rnd() * 0.1;
  const steps = 28;
  const tilt = (rnd() - 0.5) * 0.12;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (i / steps) * Math.PI * 2 * turns;
    const wobble = 1 + (rnd() - 0.5) * 0.03 + (i / steps) * 0.015;
    const x = Math.cos(t) * rx * wobble;
    const y = Math.sin(t) * ry * wobble;
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  // Catmull-Rom → Bézier para un trazo suave
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Cruz de lápiz (descarte): dos trazos cortos y algo torcidos, en la esquina superior derecha. */
export function greaseCross(seed: number): string {
  let s = seed * 7919 + 104729;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  const cx = 88 + rnd() * 2,
    cy = 13 + rnd() * 2,
    r = 6;
  const a = `M${(cx - r + rnd()).toFixed(1)} ${(cy - r + rnd()).toFixed(1)} Q${(cx + rnd() * 2).toFixed(1)} ${(cy + rnd() * 2).toFixed(1)} ${(cx + r + rnd()).toFixed(1)} ${(cy + r + rnd()).toFixed(1)}`;
  const b = `M${(cx + r + rnd()).toFixed(1)} ${(cy - r + rnd()).toFixed(1)} Q${(cx + rnd() * 2).toFixed(1)} ${(cy + rnd() * 2).toFixed(1)} ${(cx - r + rnd()).toFixed(1)} ${(cy + r + rnd()).toFixed(1)}`;
  return `${a} ${b}`;
}
