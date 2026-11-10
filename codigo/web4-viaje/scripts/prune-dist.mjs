/**
 * prune-dist.mjs — tras `astro build`, borra de dist/_astro los archivos a los que no enlaza ninguna
 * página, CSS o JS. Astro copia ahí el ORIGINAL de cada foto del contenido aunque la web lo sirva
 * desde /fotos (scripts/build-photos.mjs); sin esto el sitio duplicaría ~600 MB.
 */
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist');
async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = await walk(DIST);
const text = (await Promise.all(files.filter((f) => /\.(html|css|js|xml|json|txt|webmanifest)$/.test(f)).map((f) => readFile(f, 'utf8')))).join('\n');
let n = 0, bytes = 0;
for (const f of files) {
  if (!f.includes(`${path.sep}_astro${path.sep}`) || /\.(css|js)$/.test(f)) continue;
  if (text.includes(path.basename(f))) continue;
  bytes += (await stat(f)).size;
  await rm(f);
  n++;
}
console.log(`prune-dist: ${n} archivos sin usar borrados de dist/_astro (${(bytes / 1048576).toFixed(0)} MB)`);
