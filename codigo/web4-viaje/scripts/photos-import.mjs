#!/usr/bin/env node
/**
 * Importa fotos reales a un capítulo del viaje (web 4) a CALIDAD NATIVA.
 *
 *   npm run photos:import -- "<carpeta-origen>" <capitulo> [--featured N] [--append]
 *
 *   capitulo: número («2»), carpeta («02-la-calle») o nombre («la-calle») de src/content/fotos/
 *   --featured N  marca las N primeras como destacadas (salen en /editores)
 *   --append      las añade al final en vez de sustituir las del capítulo
 *
 * Qué hace:
 *  1. Lee JPG/JPEG/PNG/WEBP/TIFF (y HEIC/HEIF si este sharp lo soporta) de la carpeta de origen.
 *  2. Las ordena por fecha EXIF (DateTimeOriginal) y, si no hay, por nombre.
 *  3. Copia los JPEG ORIGINALES byte a byte (sin reducir ni recomprimir) como 01.jpg, 02.jpg…
 *     Otros formatos se pasan a JPEG a resolución completa (calidad 97, color 4:4:4).
 *     Las versiones para la web (640–3200 px + original) las genera scripts/build-photos.mjs en cada build.
 *  4. Reescribe la lista «photos» del index.md (conserva título, textos y demás campos): `date` desde EXIF
 *     cuando existe; pie y alt quedan como «TODO: …» en ES y EN. `place` no se inventa: se rellena a mano.
 *
 * Los pies/alt «TODO» compilan; `npm run photos:check` los lista como pendientes.
 */
import { readdir, readFile, writeFile, rm, stat, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FOTOS = path.join(ROOT, 'src/content/fotos');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const fIdx = args.indexOf('--featured');
const featuredN = fIdx >= 0 ? Math.max(0, parseInt(args[fIdx + 1] ?? '0', 10) || 0) : 0;
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--featured');
const [srcDir, chapterArg] = pos;
const append = flags.has('--append');

if (!srcDir || !chapterArg) {
  console.error('Uso: npm run photos:import -- "<carpeta-origen>" <capitulo> [--featured N] [--append]');
  process.exit(1);
}
if (!existsSync(srcDir) || !(await stat(srcDir)).isDirectory()) {
  console.error(`No existe la carpeta de origen: ${srcDir}`);
  process.exit(1);
}
const chapters = (await readdir(FOTOS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const want = chapterArg.toLowerCase();
const chapter = chapters.find(
  (c) => c === want || c.replace(/^\d+-/, '') === want || (/^\d+$/.test(want) && parseInt(c, 10) === parseInt(want, 10)),
);
if (!chapter) {
  console.error(`No encuentro el capítulo «${chapterArg}». Hay: ${chapters.join(', ')}`);
  process.exit(1);
}

const heifOk = !!sharp.format.heif?.input?.file;
const EXT = heifOk ? /\.(jpe?g|png|webp|tiff?|heic|heif)$/i : /\.(jpe?g|png|webp|tiff?)$/i;
const all = (await readdir(srcDir)).filter((f) => !f.startsWith('.'));
const skipped = heifOk ? [] : all.filter((f) => /\.(heic|heif)$/i.test(f));
if (skipped.length) console.warn(`AVISO: este sharp no lee HEIC/HEIF; salto ${skipped.length} archivo(s). Expórtalos a JPG.`);
const files = all.filter((f) => EXT.test(f));
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
  items.push({ f, abs, date: exifDate(meta), w: meta.width, h: meta.height, size: (await stat(abs)).size });
}
items.sort((a, b) => (a.date && b.date ? a.date - b.date : a.date ? -1 : b.date ? 1 : a.f.localeCompare(b.f, 'es', { numeric: true })));

const dir = path.join(FOTOS, chapter);
const mdPath = path.join(dir, 'index.md');
const raw = await readFile(mdPath, 'utf8');
const m = raw.match(/^---\n([\s\S]*?)\n---([\s\S]*)$/);
if (!m) {
  console.error(`${mdPath}: sin frontmatter`);
  process.exit(1);
}
const header = m[1].split('\n').filter((l) => l.startsWith('#')).join('\n');
const fm = YAML.parse(m[1]) ?? {};
const body = m[2] ?? '';
const prev = append && Array.isArray(fm.photos) ? fm.photos : [];
if (!append) for (const f of await readdir(dir)) if (/^\d+\.(jpe?g|png|webp|tiff?)$/i.test(f)) await rm(path.join(dir, f));

const photos = [...prev];
let n = prev.length;
for (const it of items) {
  n++;
  const name = `${String(n).padStart(2, '0')}.jpg`;
  if (/\.jpe?g$/i.test(it.abs)) {
    await copyFile(it.abs, path.join(dir, name)); // byte a byte: calidad nativa
  } else {
    await sharp(it.abs, { limitInputPixels: false })
      .rotate()
      .withMetadata()
      .jpeg({ quality: 97, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(path.join(dir, name));
  }
  const p = {
    file: `./${name}`,
    alt: 'TODO: describe lo que se ve en la foto',
    alt_en: 'TODO: describe what the photo shows',
    caption: 'TODO: pie de foto (qué pasa, quién aparece, en qué momento)',
    caption_en: 'TODO: caption (what is happening, who appears, at what moment)',
    featured: n <= featuredN,
  };
  if (it.date) p.date = it.date.toISOString().slice(0, 10);
  photos.push(p);
  console.log(`  ${it.f} → ${name}  ${it.w}×${it.h}  ${(it.size / 1048576).toFixed(1)} MB${it.date ? `  (${p.date})` : ''}`);
}

const out = { ...fm, provisional: false, photos };
await writeFile(mdPath, `---\n${header ? header + '\n' : ''}${YAML.stringify(out, { lineWidth: 0 })}---${body}`);
console.log(`\n${items.length} foto(s) importadas en src/content/fotos/${chapter}/ (originales sin tocar).`);
console.log('Siguiente: pies, alt y lugar en index.md → `npm run photos:check` → `npm run build`.');
