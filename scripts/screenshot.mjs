// Take screenshots of each visualization × curated position.
// Usage:  node scripts/screenshot.mjs [viz1|viz2|viz3|viz4|all] [posIndex|all]

import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VIZ_NAMES = ['viz1', 'viz2', 'viz3', 'viz4'];

// Tiny static file server so file:// + ESM works reliably.
function serve(dir, port) {
  const types = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.mjs': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const fp = path.join(dir, url);
      if (!fp.startsWith(dir)) { res.statusCode = 403; return res.end(); }
      fs.readFile(fp, (err, data) => {
        if (err) { res.statusCode = 404; return res.end(); }
        const ext = path.extname(fp).toLowerCase();
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        res.end(data);
      });
    });
    srv.listen(port, () => resolve(srv));
  });
}

async function main() {
  const which = process.argv[2] || 'all';
  const posArg = process.argv[3] || 'all';
  const port = 8765;
  const srv = await serve(ROOT, port);
  const browser = await puppeteer.launch({ headless: true, args: ['--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });

  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle0' });

  // Read positions array directly from the running page
  const positions = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#position-list button')).map(b => ({
      name: b.querySelector('div')?.textContent || '',
      fen: b.dataset.fen,
    }))
  );

  const outDir = path.join(ROOT, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const vizList = which === 'all' ? VIZ_NAMES : [which];
  const posList = posArg === 'all' ? positions.map((_, i) => i) : [parseInt(posArg, 10)];

  for (const vizId of vizList) {
    for (const posIdx of posList) {
      await page.evaluate((vid) => document.querySelector(`.tab[data-viz="${vid}"]`).click(), vizId);
      await page.evaluate((idx) => document.querySelectorAll('#position-list button')[idx].click(), posIdx);
      await new Promise(r => setTimeout(r, 250));

      const boardArea = await page.$('#board-area svg');
      const slug = positions[posIdx].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
      const file = path.join(outDir, `${vizId}_${posIdx}_${slug}.png`);
      await boardArea.screenshot({ path: file, omitBackground: false });
      console.log('wrote', path.relative(ROOT, file));
    }
  }

  await browser.close();
  srv.close();
}

main().catch(e => { console.error(e); process.exit(1); });
