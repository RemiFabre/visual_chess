// Board rendering. Creates one persistent SVG with named layers so overlays can be
// added/removed/refreshed independently.

import { sqName, sqIndex, fileOf, rankOf } from './chess-utils.js';

export const BOARD_SIZE = 720;
export const SQ = BOARD_SIZE / 8;
export const LIGHT = '#f0d9b5';
export const DARK = '#b58863';

const NS = 'http://www.w3.org/2000/svg';

export function pieceImageUrl(color, piece) {
  return `vendor/lichess/cburnett/${color}${piece}.svg`;
}

export function squareXY(idx, orientation = 'w') {
  // orientation: 'w' = white at bottom (default). 'b' = black at bottom (flipped).
  const f = fileOf(idx);
  const r = rankOf(idx);
  if (orientation === 'w') {
    return { x: f * SQ, y: (7 - r) * SQ };
  } else {
    return { x: (7 - f) * SQ, y: r * SQ };
  }
}

export function squareCenter(idx, orientation = 'w') {
  const { x, y } = squareXY(idx, orientation);
  return { x: x + SQ / 2, y: y + SQ / 2 };
}

export function squareAtPoint(x, y, orientation = 'w') {
  // Return the square index at viewport coords (x, y) in board space, or -1 if outside.
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return -1;
  const col = Math.floor(x / SQ);
  const row = Math.floor(y / SQ);
  if (orientation === 'w') {
    const file = col;
    const rank = 7 - row;
    return (7 - rank) * 8 + file;
  } else {
    const file = 7 - col;
    const rank = row;
    return (7 - rank) * 8 + file;
  }
}

export function createBoard(orientation = 'w') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
  svg.setAttribute('width', BOARD_SIZE);
  svg.setAttribute('height', BOARD_SIZE);
  svg.classList.add('board');

  const layers = {
    squares:  group('layer-squares'),
    pressure: group('layer-pressure'),
    sight:    group('layer-sight'),
    guards:   group('layer-guards'),
    knight:   group('layer-knight'),
    pieces:   group('layer-pieces'),
    ice:      group('layer-ice'),
    drag:     group('layer-drag'),
    coords:   group('layer-coords'),
  };

  svg.append(
    layers.squares, layers.pressure, layers.sight, layers.guards,
    layers.knight, layers.pieces, layers.ice, layers.drag, layers.coords,
  );

  drawBoardSquares(layers.squares, orientation);
  drawCoords(layers.coords, orientation);

  return { svg, layers, orientation };
}

export function drawBoardSquares(layer, orientation = 'w') {
  layer.replaceChildren();
  for (let i = 0; i < 64; i++) {
    const { x, y } = squareXY(i, orientation);
    const f = fileOf(i), r = rankOf(i);
    const isLight = (f + r) % 2 === 1;
    const rect = el('rect', { x, y, width: SQ, height: SQ, fill: isLight ? LIGHT : DARK });
    rect.dataset.idx = i;
    rect.dataset.square = sqName(i);
    layer.appendChild(rect);
  }
}

export function paintBoardSolid(layer, color = LIGHT) {
  // Replace the 64 squares with a single-colour background. Used by Pressure.
  layer.replaceChildren(el('rect', {
    x: 0, y: 0, width: BOARD_SIZE, height: BOARD_SIZE, fill: color,
  }));
}

function drawCoords(layer, orientation) {
  layer.replaceChildren();
  for (let f = 0; f < 8; f++) {
    const fileChar = 'abcdefgh'[orientation === 'w' ? f : 7 - f];
    const x = f * SQ + 4;
    const y = BOARD_SIZE - 6;
    layer.appendChild(text(x, y, fileChar, { fill: (f % 2 === 1) ? DARK : LIGHT, 'font-size': 12 }));
  }
  for (let r = 0; r < 8; r++) {
    const rankNum = orientation === 'w' ? (8 - r) : (r + 1);
    const y = r * SQ + 14;
    const x = BOARD_SIZE - 12;
    layer.appendChild(text(x, y, String(rankNum), { fill: (r % 2 === 0) ? DARK : LIGHT, 'font-size': 12 }));
  }
}

export function renderPieces(layer, board, { exclude = new Set(), opacityFor = null, orientation = 'w' } = {}) {
  layer.replaceChildren();
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (exclude.has(i)) continue;
    const { x, y } = squareXY(i, orientation);
    const op = opacityFor ? opacityFor(i, p) : 1;
    const g = group();
    g.setAttribute('data-idx', i);
    g.setAttribute('data-square', sqName(i));
    g.setAttribute('data-color', p.color);
    g.setAttribute('data-piece', p.piece);
    g.setAttribute('opacity', op);
    const img = el('image', {
      x, y, width: SQ, height: SQ,
      href: pieceImageUrl(p.color, p.piece),
      preserveAspectRatio: 'xMidYMid meet',
    });
    g.appendChild(img);
    layer.appendChild(g);
  }
}

// --- SVG helpers --------------------------------------------------------------
export function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
export function group(cls) {
  const g = el('g');
  if (cls) g.setAttribute('class', cls);
  return g;
}
export function text(x, y, str, attrs = {}) {
  const t = el('text', { x, y, ...attrs });
  t.textContent = str;
  return t;
}
export function line(x1, y1, x2, y2, attrs = {}) {
  return el('line', { x1, y1, x2, y2, ...attrs });
}
