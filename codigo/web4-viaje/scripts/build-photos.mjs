/**
 * build-photos.mjs — versiones de las fotos a CALIDAD NATIVA (web 4; mismo criterio que la web 2, 10/11/2026).
 *
 *   node scripts/build-photos.mjs        (se ejecuta solo antes de `astro build` y `astro dev`)
 *
 * Por qué existe: el servicio de imágenes de Astro solo deja elegir la calidad, y WebP/AVIF a calidad
 * normal reducen el color a la mitad de resolución (4:2:0), que se nota en luces rojas y naranjas de
 * concierto. Las mismas versiones alimentan la historia 2D, /sobre, la capa <img> nativa del viaje 3D
 * (foto en reposo y lightbox) y las texturas WebGL (elegidas según el tamaño real en pantalla). Aquí cada foto se genera con control total:
 *
 *  · Fuente: el ORIGINAL tal cual sale de Lightroom (src/content/fotos/<NN-capitulo>/NN.jpg, sin reducir).
 *  · Versiones para la web: JPEG calidad 95, color a resolución completa (4:4:4), progresivo (mozjpeg),
 *    reducción a 16 bits por canal con Lanczos (sin gamma: a 8 bits aplastaba los negros), orientación EXIF aplicada y perfil sRGB incrustado.
 *    Anchos: 640, 800, 1080, 1280, 1600, 2000, 2400 y 3200 px (solo los menores que el original). El navegador elige
 *    según el tamaño en pantalla × densidad de píxeles, así nunca se ve una foto estirada.
 *  · Original: NN-original.jpg = el archivo original byte a byte (sin recomprimir). Si pasa de 24 MiB
 *    (límite de Cloudflare Pages: 25 MiB por archivo) se guarda a resolución completa en JPEG 97 4:4:4.
 *
 * Salida: public/fotos/<NN-capitulo>/NN-<ancho>.jpg y NN-original.jpg (public/fotos está en .gitignore).
 * Mantener WIDTHS igual que FOTO_WIDTHS en src/lib/fotos.ts.
 * Caché: node_modules/.astro/fotos (Cloudflare Pages conserva node_modules/.astro entre builds): solo se
 * regenera lo que cambia.
 */
import { readdir, mkdir, stat, copyFile, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

export const WIDTHS = [320, 480, 640, 800, 1080, 1280, 1600, 2000, 2400, 3200];
const QUALITY = 95;
const MAX_ORIGINAL = 24 * 1024 * 1024;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src/content/fotos');
// otras fotos que no son de un capítulo (salida en public/fotos/<slug>/): el retrato de /sobre
const EXTRA = { retrato: path.join(ROOT, 'src/assets/retrato') };
const CACHE = path.join(ROOT, 'node_modules/.astro/fotos');
const OUT = path.join(ROOT, 'public/fotos');
// v2: SIN .gamma() (en sharp va en 8 bits y aplastaba los negros en bandas) y reducción a 16 bits por canal.
// Comprobado: mismo brillo que una reducción de referencia. Cambiar VERSION fuerza a regenerar todo.
const VERSION = 'v2-q95-444-rgb16';

sharp.concurrency(Math.max(1, Math.min(4, os.cpus().length)));

const jpegOpts = (q) => ({ quality: q, chromaSubsampling: '4:4:4', mozjpeg: true, progressive: true });

// Una versión vale si existe y no está vacía. Que corresponda a la foto ACTUAL lo garantiza la huella
// (sha1 del original, en «NN.src»): NO se usa la fecha de los archivos, porque en Cloudflare la caché
// restaurada es más nueva que el clon del repo y se servían versiones de la foto anterior
// (bug visto el 11/11/2026: la foto de muestra de 02-la-calle/01 seguía publicada).
async function fresh(out) {
  if (!existsSync(out)) return false;
  return (await stat(out)).size > 0;
}
const thumb = async (input) =>
  sharp(input, { limitInputPixels: false }).rotate().resize(48, 48, { fit: 'fill' }).greyscale().raw().toBuffer();
/** ¿es la misma foto? (miniatura 48 px en grises: misma foto ≈ 1–5 por color/ICC; otra foto ≫ 40) */
async function sameThumb(srcThumb, cached) {
  try {
    const b = await thumb(cached);
    if (srcThumb.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < b.length; i++) d += Math.abs(srcThumb[i] - b[i]);
    if (process.env.FOTOS_DEBUG) console.log('  huella', cached, (d / b.length).toFixed(2));
    return d / b.length < 12;
  } catch {
    return false;
  }
}
const sha1 = async (f) => createHash('sha1').update(await readFile(f)).digest('hex');

const srcDir = (slug) => EXTRA[slug] ?? path.join(SRC, slug);

async function one(slug, file) {
  const src = path.join(srcDir(slug), file);
  const base = file.replace(/\.jpe?g$/i, '');
  const dir = path.join(CACHE, VERSION, slug);
  await mkdir(dir, { recursive: true });
  const st = await stat(src);
  // Huella (sha1 del original) en «NN.huella». Si falta o no coincide, se revisa CADA versión de la caché
  // contra el original (miniatura) y se borran las que no son esta foto. Antes (11/11/2026) solo se miraba
  // la de 320 px: en Cloudflare esa era nueva pero las de 640–3200 y el original seguían siendo la foto de
  // muestra anterior, y al abrir la foto salía la PROVISIONAL. Las «.src» de esa versión no valen.
  const print = path.join(dir, `${base}.huella`);
  const hash = await sha1(src);
  const old = existsSync(print) ? (await readFile(print, 'utf8')).trim() : '';
  if (existsSync(path.join(dir, `${base}.src`))) await rm(path.join(dir, `${base}.src`));
  if (old !== hash) {
    const files = (await readdir(dir)).filter((f) => f.startsWith(`${base}-`) && f.endsWith('.jpg'));
    if (files.length) {
      const t = await thumb(src);
      for (const f of files) if (!(await sameThumb(t, path.join(dir, f)))) await rm(path.join(dir, f));
    }
    await writeFile(print, hash);
  }
  const meta = await sharp(src).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const w = rotated ? meta.height : meta.width;
  const jobs = [];
  // fuera las versiones que ya no tocan (p. ej. se cambió la foto por otra más pequeña): si no, se servirían
  // versiones grandes de la foto ANTERIOR
  const expected = new Set([...WIDTHS.filter((x) => x < w).map((x) => `${base}-${x}.jpg`), `${base}-original.jpg`]);
  for (const f of await readdir(dir)) if (f.startsWith(`${base}-`) && !expected.has(f)) await rm(path.join(dir, f));

  for (const width of WIDTHS.filter((x) => x < w)) {
    const out = path.join(dir, `${base}-${width}.jpg`);
    if (await fresh(out)) continue;
    jobs.push(
      sharp(src, { limitInputPixels: false })
        .rotate()
        // 16 bits por canal durante la reducción: sin escalones ni manchas en negros y degradados.
        // OJO: no usar .gamma(): sharp la aplica a 8 bits y aplasta las sombras (bug visto el 10/11/2026).
        .pipelineColourspace('rgb16')
        .resize({ width, kernel: 'lanczos3', withoutEnlargement: true })
        .toColourspace('srgb')
        .withIccProfile('srgb')
        .keepExif()
        .jpeg(jpegOpts(QUALITY))
        .toFile(out),
    );
  }

  const orig = path.join(dir, `${base}-original.jpg`);
  if (!(await fresh(orig))) {
    if (st.size <= MAX_ORIGINAL) jobs.push(copyFile(src, orig));
    else jobs.push(sharp(src, { limitInputPixels: false }).rotate().withIccProfile('srgb').keepExif().jpeg(jpegOpts(97)).toFile(orig));
  }
  await Promise.all(jobs);
  return jobs.length;
}

const t0 = Date.now();
let made = 0, total = 0;
const slugs = (await readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
for (const [k, d] of Object.entries(EXTRA)) if (existsSync(d)) slugs.push(k);
for (const slug of slugs) {
  const files = (await readdir(srcDir(slug))).filter((f) => /^\d+\.jpe?g$/i.test(f)).sort();
  for (const f of files) {
    made += await one(slug, f);
    total++;
  }
}
// public/fotos = copia exacta de la caché (borra lo que ya no existe)
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const slug of slugs) {
  const from = path.join(CACHE, VERSION, slug);
  if (existsSync(from)) await cp(from, path.join(OUT, slug), { recursive: true, filter: (f) => !f.endsWith('.src') && !f.endsWith('.huella') });
}
// quita de public/fotos las versiones de fotos que ya no están en el contenido
for (const slug of slugs) {
  const keep = new Set((await readdir(srcDir(slug))).filter((f) => /^\d+\.jpe?g$/i.test(f)).map((f) => f.replace(/\.jpe?g$/i, '')));
  const dir = path.join(OUT, slug);
  if (!existsSync(dir)) continue;
  for (const f of await readdir(dir)) if (!keep.has(f.split('-')[0])) await rm(path.join(dir, f));
}
console.log(`fotos: ${total} fotos, ${made} archivos generados en ${((Date.now() - t0) / 1000).toFixed(1)} s → public/fotos/`);
