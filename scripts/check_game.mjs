import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/remi/visual_chess';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fp = path.join(ROOT, url);
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(fp).toLowerCase()] || 'application/octet-stream');
    res.end(data);
  });
});
await new Promise(r => srv.listen(8766, r));

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', r => errors.push('REQ: ' + r.url() + ' ' + r.failure().errorText));
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });
await page.goto('http://localhost:8766/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 800));

// Toggle Pressure overlay on
await page.click('button[data-overlay="pressure"]');
await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: '/tmp/game_pressure.png' });

// Try a drag: pick up Nf3 (square f3) and drop on e5 — illegal but tests pickup
// Actually do a legal move for black (to move): e7 to e5? Pe5 already. Try a real legal move.
// Default position is Italian middlegame, Black to move. Legal black moves include Bb4+, Nxe4, etc.
// Easier: click new-game to reset, then play 1.e4 as white.
await page.click('#new-game');
await new Promise(r => setTimeout(r, 200));
await page.screenshot({ path: '/tmp/game_newgame.png' });

const movesBefore = await page.evaluate(() => document.querySelectorAll('#move-list div').length);

// Simulate drag from e2 to e4
const boardRect = await page.evaluate(() => {
  const svg = document.querySelector('#board-area svg');
  const r = svg.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
// e2 is file 4 (e), rank 2. With white at bottom: x = 4*sq, y = 6*sq (rank 2 from top is index 6)
const SQ_CSS = boardRect.w / 8;
const fromX = boardRect.x + 4 * SQ_CSS + SQ_CSS / 2;
const fromY = boardRect.y + 6 * SQ_CSS + SQ_CSS / 2;
const toX = boardRect.x + 4 * SQ_CSS + SQ_CSS / 2;
const toY = boardRect.y + 4 * SQ_CSS + SQ_CSS / 2;

await page.mouse.move(fromX, fromY);
await page.mouse.down();
await page.mouse.move(toX, toY, { steps: 8 });
await page.mouse.up();
await new Promise(r => setTimeout(r, 300));

const movesAfter = await page.evaluate(() => document.querySelectorAll('#move-list div').length);
const fenAfter = await page.evaluate(() => document.getElementById('fen-input').value);
await page.screenshot({ path: '/tmp/game_e4.png' });

console.log('moves before drag:', movesBefore);
console.log('moves after drag:', movesAfter);
console.log('fen after drag:', fenAfter);
console.log('errors:', errors.length ? errors : 'none');

await browser.close();
srv.close();
