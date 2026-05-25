// Board rendering, produces SVG. Visualizations attach overlays as <g> children before/after the piece layer.

import { sqName, sqIndex, fileOf, rankOf } from './chess-utils.js';

export const BOARD_SIZE = 720; // px
export const SQ = BOARD_SIZE / 8;
export const LIGHT = '#f0d9b5';
export const DARK = '#b58863';

const PIECE_GLYPH = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

export function squareXY(idx) {
  // Returns top-left in board coordinates (board oriented with white on bottom).
  const f = fileOf(idx);
  const r = rankOf(idx);
  return { x: f * SQ, y: (7 - r) * SQ };
}

export function squareCenter(idx) {
  const { x, y } = squareXY(idx);
  return { x: x + SQ / 2, y: y + SQ / 2 };
}

export function createBoardSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
  svg.setAttribute('width', BOARD_SIZE);
  svg.setAttribute('height', BOARD_SIZE);
  svg.classList.add('board');

  const layerSquares = group('layer-squares');
  const layerControl = group('layer-control');
  const layerAttack = group('layer-attack');
  const layerPieces = group('layer-pieces');
  const layerPins = group('layer-pins');
  const layerCoords = group('layer-coords');

  svg.append(layerSquares, layerControl, layerAttack, layerPieces, layerPins, layerCoords);

  // Squares
  for (let i = 0; i < 64; i++) {
    const { x, y } = squareXY(i);
    const f = fileOf(i), r = rankOf(i);
    const isLight = (f + r) % 2 === 1;
    const rect = el('rect', { x, y, width: SQ, height: SQ, fill: isLight ? LIGHT : DARK });
    rect.dataset.idx = i;
    rect.dataset.square = sqName(i);
    layerSquares.appendChild(rect);
  }

  // Coordinates
  for (let f = 0; f < 8; f++) {
    const x = f * SQ + 4;
    const y = BOARD_SIZE - 6;
    const t = text(x, y, 'abcdefgh'[f], { fill: (f % 2 === 1) ? DARK : LIGHT, 'font-size': 12 });
    layerCoords.appendChild(t);
  }
  for (let r = 0; r < 8; r++) {
    const y = r * SQ + 14;
    const x = BOARD_SIZE - 12;
    const t = text(x, y, '8' - 0 - r + 1 + '', { fill: (r % 2 === 0) ? DARK : LIGHT, 'font-size': 12 });
    // ^ messy; rewrite clean:
    t.textContent = `${8 - r}`;
    layerCoords.appendChild(t);
  }

  return { svg, layers: { squares: layerSquares, control: layerControl, attack: layerAttack, pieces: layerPieces, pins: layerPins, coords: layerCoords } };
}

// Board pieces use the cburnett (Lichess default) SVGs in vendor/lichess/cburnett/.
// Kept here as a function so we can swap to a different set later if we want.
export function pieceImageUrl(color, piece) {
  return `vendor/lichess/cburnett/${color}${piece}.svg`;
}

export function renderPieces(layer, board, { exclude = new Set(), opacityFor = null } = {}) {
  layer.replaceChildren();
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (exclude.has(i)) continue;
    const { x, y } = squareXY(i);
    const op = opacityFor ? opacityFor(i, p) : 1;
    const g = group();
    g.setAttribute('data-idx', i);
    g.setAttribute('opacity', op);

    // cburnett SVGs are already designed to fill the cell with slight padding;
    // we fill the full square.
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
const NS = 'http://www.w3.org/2000/svg';
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
