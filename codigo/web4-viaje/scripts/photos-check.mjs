// Revisa las fotos de src/content/fotos/*/index.md: pie y alt (ES/EN), archivos, tamaño, EXIF de autor,
// y rellena `dominant` con el color dominante de cada foto. Exit 1 si hay errores.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import YAML from 'yaml';

const ROOT = new URL('../src/content/fotos/', import.meta.url).pathname;
const errors = [];
const warnings = [];
let count = 0;
const hex = (n) => n.toString(16).padStart(2, '0');

for (const dir of (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const mdPath = join(ROOT, dir, 'index.md');
  const raw = await readFile(mdPath, 'utf8');
  const [, fm, body = ''] = raw.split(/^---$/m);
  const data = YAML.parse(fm);
  for (const k of ['n', 'title', 'title_en', 'text', 'text_en', 'kicker', 'kicker_en']) if (!data[k]) errors.push(`${dir}: falta «${k}»`);
  const files = new Set((await readdir(join(ROOT, dir))).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f)));
  let changed = false;
  for (const p of data.photos ?? []) {
    count++;
    const name = String(p.file).replace(/^\.\//, '');
    const where = `${dir}/${name}`;
    files.delete(name);
    for (const k of ['caption', 'caption_en', 'alt', 'alt_en']) if (!p[k] || String(p[k]).trim().length < 10) errors.push(`${where}: falta «${k}»`);
    if (/^(foto|photo|imagen|image)\s*\d*$/i.test(String(p.alt ?? '').trim())) errors.push(`${where}: el alt no describe la foto`);
    if (/PROVISIONAL/.test(String(p.caption))) warnings.push(`${where}: pie provisional`);
    try {
      const img = sharp(join(ROOT, dir, name));
      const meta = await img.metadata();
      if (Math.max(meta.width, meta.height) > 4000) warnings.push(`${where}: ${meta.width}×${meta.height}, más de 4000 px`);
      let artist = '';
      try {
        const ex = meta.exif ? exifReader(meta.exif) : null;
        artist = ex?.Image?.Artist || ex?.Image?.Copyright || '';
      } catch {}
      if (!artist) warnings.push(`${where}: sin autor/copyright en EXIF`);
      const { dominant } = await img.stats();
      const d = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
      if (p.dominant !== d) {
        p.dominant = d;
        changed = true;
      }
    } catch (e) {
      errors.push(`${where}: no se puede leer (${e.message})`);
    }
  }
  for (const f of files) warnings.push(`${dir}/${f}: está en la carpeta pero no en index.md`);
  if (changed) await writeFile(mdPath, `---\n${YAML.stringify(data)}---${body}`);
}

const prov = warnings.filter((w) => w.includes('provisional')).length;
const other = warnings.filter((w) => !w.includes('provisional'));
console.log(`Fotos revisadas: ${count}`);
if (other.length) console.log(`\nAVISOS (${other.length}):\n  ` + other.slice(0, 40).join('\n  '));
if (prov) console.log(`\nPies provisionales pendientes: ${prov}`);
if (errors.length) {
  console.log(`\nERRORES (${errors.length}):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log('\nSin errores.');
