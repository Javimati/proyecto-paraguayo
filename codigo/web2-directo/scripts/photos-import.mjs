#!/usr/bin/env node
/**
 * Importa fotos reales a una sección de la web.
 *
 *   npm run photos:import -- "<carpeta-origen>" <slug> [--select N] [--replace]
 *
 *   slug: fiesta-naranja | supernoventeros | mas-trabajos (o cualquier carpeta nueva de src/content/eventos/)
 *   --select N  marca las N primeras fotos como destacadas (selected: true → /para-promotores)
 *   --replace   (por defecto) sustituye las fotos de la sección; --append las añade al final
 *
 * Qué hace:
 *  1. Lee JPG/JPEG/PNG/WEBP/TIFF (y HEIC/HEIF si este sharp lo soporta; si no, avisa y las salta) de la carpeta
 *     de origen (sin subcarpetas).
 *  2. Las ordena por fecha EXIF (DateTimeOriginal) y, si no hay, por nombre.
 *  3. Las reduce a 3000 px de lado largo, JPEG calidad 88, conservando EXIF/IPTC/ICC (withMetadata),
 *     y las guarda como 01.jpg, 02.jpg… en src/content/eventos/<slug>/.
 *  4. Reescribe la lista «photos» del index.md: conserva título, resumen y demás campos; pone `date` desde
 *     EXIF cuando existe y deja pie y alt como «TODO: …» en ES y EN.
 *
 * Modo TODO: los pies/alt que empiezan por «TODO» compilan (no rompen el build) y `npm run photos:check`
 * los lista como pendientes. Hay que sustituirlos antes de publicar en serio.
 */
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--select');
const selIdx = args.indexOf('--select');
const select = selIdx >= 0 ? Math.max(0, parseInt(args[selIdx + 1] ?? '0', 10) || 0) : 0;
const [srcDir, slug] = pos;
const append = flags.has('--append');

if (!srcDir || !slug) {
  console.error('Uso: npm run photos:import -- "<carpeta-origen>" <slug> [--select N] [--append]');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug no válido: «${slug}» (solo minúsculas, números y guiones)`);
  process.exit(1);
}
if (!existsSync(srcDir) || !(await stat(srcDir)).isDirectory()) {
  console.error(`No existe la carpeta de origen: ${srcDir}`);
  process.exit(1);
}

const heifOk = !!sharp.format.heif?.input?.file;
const EXT = heifOk ? /\.(jpe?g|png|webp|tiff?|heic|heif)$/i : /\.(jpe?g|png|webp|tiff?)$/i;
const all = (await readdir(srcDir)).filter((f) => !f.startsWith('.'));
const skippedHeic = heifOk ? [] : all.filter((f) => /\.(heic|heif)$/i.test(f));
const files = all.filter((f) => EXT.test(f));
if (skippedHeic.length) console.warn(`AVISO: este sharp no lee HEIC/HEIF; salto ${skippedHeic.length} archivo(s). Expórtalos a JPG.`);
if (!files.length) {
  console.error('No hay imágenes compatibles en la carpeta.');
  process.exit(1);
}

function exifDate(meta) {
  try {
    if (!meta.exif) return null;
    const ex = exifReader(meta.exif);
    const d = ex?.Photo?.DateTimeOriginal ?? ex?.exif?.DateTimeOriginal ?? ex?.Image?.DateTime;
    return d instanceof Date && !isNaN(d) ? d : null;
  } catch {
    return null;
  }
}

const items = [];
for (const f of files) {
  const abs = path.join(srcDir, f);
  const meta = await sharp(abs).metadata();
  items.push({ f, abs, date: exifDate(meta), w: meta.width, h: meta.height });
}
items.sort((a, b) => (a.date && b.date ? a.date - b.date : a.date ? -1 : b.date ? 1 : a.f.localeCompare(b.f, 'es', { numeric: true })));

const dir = path.join(ROOT, 'src/content/eventos', slug);
await mkdir(dir, { recursive: true });
const mdPath = path.join(dir, 'index.md');
let fm = {};
let header = '';
if (existsSync(mdPath)) {
  const raw = await readFile(mdPath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (m) {
    header = m[1].split('\n').filter((l) => l.startsWith('#')).join('\n');
    fm = YAML.parse(m[1]) ?? {};
  }
}
const prev = append && Array.isArray(fm.photos) ? fm.photos : [];
if (!append) {
  for (const f of await readdir(dir)) if (/^\d+\.(jpe?g|png|webp)$/i.test(f)) await rm(path.join(dir, f));
}

const photos = [...prev];
let n = prev.length;
for (const it of items) {
  n++;
  const name = `${String(n).padStart(2, '0')}.jpg`;
  await sharp(it.abs)
    .rotate() // respeta la orientación EXIF
    .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
    .withMetadata() // conserva EXIF/IPTC/ICC (autor, copyright)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(dir, name));
  const p = {
    file: `./${name}`,
    caption: 'TODO: pie de foto (qué pasa, quién aparece, en qué momento)',
    caption_en: 'TODO: caption (what is happening, who appears, at what moment)',
    selected: n <= select,
    alt: 'TODO: describe lo que se ve en la foto',
    alt_en: 'TODO: describe what the photo shows',
  };
  if (it.date) p.date = it.date.toISOString().slice(0, 10);
  photos.push(p);
  console.log(`  ${it.f} → ${name}${it.date ? `  (${p.date})` : ''}`);
}

const title = fm.title ?? slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const out = {
  title,
  title_en: fm.title_en ?? title,
  artist: fm.artist ?? title,
  artist_en: fm.artist_en ?? fm.title_en ?? title,
  ...fm,
  summary: fm.summary ?? 'TODO: dos o tres frases sobre el evento.',
  summary_en: fm.summary_en ?? 'TODO: two or three sentences about the event.',
  cover: append && fm.cover ? fm.cover : './01.jpg',
  order: fm.order ?? 99,
  provisional: false,
  photos,
};
// Si todas las fotos son del mismo día y la sección no es mixta, propone la fecha del evento
const days = [...new Set(photos.map((p) => p.date).filter(Boolean))];
if (!out.mixed && !out.date && days.length === 1) out.date = days[0];

await writeFile(mdPath, `---\n${header ? header + '\n' : ''}${YAML.stringify(out, { lineWidth: 0 })}---\n`);
console.log(`\n${items.length} foto(s) importadas en src/content/eventos/${slug}/ (${select} destacadas).`);
console.log('Siguiente: rellena pies y alt (TODO) en index.md, después `npm run photos:check` y `npm run build`.');
