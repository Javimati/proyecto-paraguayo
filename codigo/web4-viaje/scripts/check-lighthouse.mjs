// Lighthouse móvil sobre dist/ (servidor estático propio). Falla si alguna categoría baja de 0,9,
// LCP > 2,5 s o CLS > 0,05. Requiere Chrome: CHROME_PATH=/ruta/a/chrome npm run check:lh
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
const run = promisify(execFile);

const DIST = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml' };
const server = createServer(async (req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    // como Cloudflare Pages: texto comprimido (sin esto Lighthouse simula un HTML varias veces más pesado)
    const type = TYPES[extname(p)] ?? 'application/octet-stream';
    const body = await readFile(p);
    if (/^(text|application\/(json|xml)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', vary: 'accept-encoding' });
      res.end(gzipSync(body, { level: 9 }));
    } else {
      res.writeHead(200, { 'content-type': type });
      res.end(body);
    }
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(await readFile(join(DIST, '404.html')).catch(() => 'not found'));
  }
}).listen(4499);

const urls = ['/', '/editores/', '/en/'];
let failed = false;
for (const u of urls) {
  const { stdout: out } = await run('npx', ['-y', 'lighthouse@12', `http://localhost:4499${u}`, '--quiet', '--output=json', '--chrome-flags=--headless=new --no-sandbox --disable-background-networking --disable-sync --no-first-run', '--only-categories=performance,accessibility,best-practices,seo'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); // async: el servidor de este mismo proceso debe seguir respondiendo
  const r = JSON.parse(out);
  const cats = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const lcp = r.audits['largest-contentful-paint'].numericValue;
  const cls = r.audits['cumulative-layout-shift'].numericValue;
  const ok = Object.values(cats).every((s) => s >= 90) && lcp < 2500 && cls < 0.05;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok   ' : 'FALLA'} ${u.padEnd(12)} ${JSON.stringify(cats)} LCP ${(lcp / 1000).toFixed(2)} s  CLS ${cls.toFixed(3)}`);
}
server.close();
process.exit(failed ? 1 : 0);
