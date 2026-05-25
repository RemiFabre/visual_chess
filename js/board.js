// Board rendering — produces SVG. Visualizations attach overlays as <g> children before/after the piece layer.

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
  const layerBubbles = group('layer-bubbles');
  const layerCoords = group('layer-coords');

  svg.append(layerSquares, layerControl, layerAttack, layerPieces, layerPins, layerBubbles, layerCoords);

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

  return { svg, layers: { squares: layerSquares, control: layerControl, attack: layerAttack, pieces: layerPieces, pins: layerPins, bubbles: layerBubbles, coords: layerCoords } };
}

// Global toggle: use the generated PNG sprites if true, else Unicode glyphs.
// `availableSprites` is the set of `${color}${piece}` strings whose PNG exists.
let useSprites = false;
let availableSprites = new Set();

export function setSpriteSupport(enabled, available) {
  useSprites = !!enabled;
  availableSprites = new Set(available || []);
}

export function renderPieces(layer, board, { exclude = new Set(), opacityFor = null } = {}) {
  layer.replaceChildren();
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (exclude.has(i)) continue;
    const { x, y } = squareXY(i);
    const cx = x + SQ / 2;
    const cy = y + SQ / 2;
    const op = opacityFor ? opacityFor(i, p) : 1;
    const g = group();
    g.setAttribute('data-idx', i);
    g.setAttribute('opacity', op);

    const key = `${p.color}${p.piece}`;
    if (useSprites && availableSprites.has(key)) {
      // PNG sprite — slightly inset so it doesn't touch the square edges.
      const pad = SQ * 0.06;
      const img = el('image', {
        x: x + pad, y: y + pad, width: SQ - 2 * pad, height: SQ - 2 * pad,
        href: `sprites/piece_${key}.png`,
        preserveAspectRatio: 'xMidYMid meet',
      });
      g.appendChild(img);
    } else {
      const glyph = PIECE_GLYPH[p.color][p.piece];
      const strokeColor = p.color === 'w' ? '#222' : '#fff';
      const fillColor = p.color === 'w' ? '#fff' : '#222';
      const t = text(cx, cy, glyph, {
        'font-size': SQ * 0.85, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        fill: fillColor, stroke: strokeColor, 'stroke-width': SQ * 0.04, 'paint-order': 'stroke',
        'font-family': '"Noto Sans Symbols 2", "DejaVu Sans", "Segoe UI Symbol", "Arial Unicode MS", sans-serif',
      });
      g.appendChild(t);
    }
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
