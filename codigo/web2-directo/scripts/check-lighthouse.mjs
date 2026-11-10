// Lighthouse en móvil simulado sobre la web compilada. Falla si algo baja de los presupuestos.
// Uso: npm run build && npm run check:lh   (necesita Chrome; CHROME_PATH si no está en el PATH)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
import { createServer } from 'node:http';
import { stat, readFile as readFileP } from 'node:fs/promises';
import { extname } from 'node:path';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4399;
const PAGES = ['/', '/eventos/fiesta-naranja/', '/para-promotores', '/en/'];
const MIN = 0.9, LCP = 2500, CLS = 0.05, TBT = 200;

// Servidor estático mínimo sobre dist/ (independiente de `astro preview`)
const DIST = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.pdf': 'application/pdf' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const candidates = [p, join(p, 'index.html'), p + '.html'];
  for (const c of candidates) {
    try {
      const f = join(DIST, c);
      if (!f.startsWith(DIST) || !(await stat(f)).isFile()) continue;
      res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' });
      return res.end(await readFileP(f));
    } catch {}
  }
  res.writeHead(404, { 'content-type': 'text/html' });
  res.end(await readFileP(join(DIST, '404.html')).catch(() => 'not found'));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const dir = mkdtempSync(join(tmpdir(), 'lh-'));
let failed = false;
try {
  for (const page of PAGES) {
    const out = join(dir, 'r.json');
    await execFileP('npx', ['-y', 'lighthouse@12', `http://127.0.0.1:${PORT}${page}`, '--quiet',
      '--chrome-flags=--headless=new --no-sandbox --no-proxy-server', '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json', `--output-path=${out}`], { maxBuffer: 1 << 26, env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' } });
    const r = JSON.parse(readFileSync(out, 'utf8'));
    const c = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, v.score]));
    const a = r.audits;
    const lcp = a['largest-contentful-paint'].numericValue, cls = a['cumulative-layout-shift'].numericValue, tbt = a['total-blocking-time'].numericValue;
    const bad = Object.values(c).some((s) => s < MIN) || lcp > LCP || cls > CLS || tbt > TBT;
    failed ||= bad;
    console.log(`${bad ? 'FALLA' : 'ok   '} ${page.padEnd(24)} P${Math.round(c.performance * 100)} A${Math.round(c.accessibility * 100)} BP${Math.round(c['best-practices'] * 100)} SEO${Math.round(c.seo * 100)}  LCP ${(lcp / 1000).toFixed(2)} s  CLS ${cls.toFixed(3)}  TBT ${Math.round(tbt)} ms`);
  }
} finally {
  server.close();
}
process.exit(failed ? 1 : 0);
