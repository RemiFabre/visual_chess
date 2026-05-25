import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
const ROOT = '/Users/remi/visual_chess';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  const fp = path.join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  fs.readFile(fp, (err, data) => { if (err) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(fp).toLowerCase()] || 'application/octet-stream'); res.end(data); });
});
await new Promise(r => srv.listen(8767, r));
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
await page.goto('http://localhost:8767/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await page.click('#new-game');
await new Promise(r => setTimeout(r, 200));

const rect = await page.evaluate(() => {
  const s = document.querySelector('#board-area svg');
  const r = s.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width };
});
const SQ = rect.w / 8;
const e2x = rect.x + 4 * SQ + SQ / 2;
const e2y = rect.y + 6 * SQ + SQ / 2;

// Press on e2 (white pawn) and move halfway, take screenshot mid-drag.
await page.mouse.move(e2x, e2y);
await page.mouse.down();
await page.mouse.move(e2x + 30, e2y - 60, { steps: 4 });
await new Promise(r => setTimeout(r, 100));
await page.screenshot({ path: '/tmp/mid_drag.png' });
const ghostExists = await page.evaluate(() => document.querySelector('#board-area .layer-ghost image') !== null);
const sourceHidden = await page.evaluate(() => {
  const g = document.querySelector('#board-area .layer-pieces g[data-square="e2"]');
  return g ? g.getAttribute('visibility') === 'hidden' : false;
});
await page.mouse.up();
console.log('ghost exists mid-drag:', ghostExists);
console.log('source hidden mid-drag:', sourceHidden);

// Click-to-move: click e2, then click e4.
await new Promise(r => setTimeout(r, 200));
await page.click('#new-game');
await new Promise(r => setTimeout(r, 200));
await page.mouse.click(e2x, e2y);
await new Promise(r => setTimeout(r, 200));
const hintsAfterClick = await page.evaluate(() => document.querySelector('#board-area .layer-hints') ? document.querySelector('#board-area .layer-hints').children.length : 0);
await page.mouse.click(rect.x + 4 * SQ + SQ / 2, rect.y + 4 * SQ + SQ / 2);
await new Promise(r => setTimeout(r, 200));
const fenAfterClicks = await page.evaluate(() => document.getElementById('fen-input').value);
console.log('hints after click e2:', hintsAfterClick);
console.log('fen after click-to-move e2->e4:', fenAfterClicks);

await browser.close();
srv.close();
