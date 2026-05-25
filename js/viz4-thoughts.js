// Visualization 4: thought bubbles.
// Each piece carries a small comic bubble showing what it's defending. When a single piece is
// defending multiple valuable things, its bubble grows + gains a "overloaded" sweat-drop indicator.

import { parseFEN, computeDefendedMap, pieceValue } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, squareXY, SQ, el, group } from './board.js';

const GLYPH = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { defending } = computeDefendedMap(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  renderPieces(layers.pieces, board);

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const defends = defending[i];
    if (defends.length === 0) continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;

    // Overload score = sum of values of pieces being defended, minus a small constant.
    // A bishop defending 1 pawn = 1 → "fine". A queen defending 3 pieces (rook + bishop + pawn) = 9 → heavy.
    const load = defends.reduce((s, sq) => s + pieceValue(board[sq].piece), 0);
    const overload = load >= 5; // tunable

    drawBubble(layers.bubbles, i, p, defends.map(sq => board[sq]), { overload, board });
  }
}

function drawBubble(layer, fromIdx, piece, defendedPieces, { overload, board }) {
  const center = squareCenter(fromIdx);
  // Place the bubble above and to the side of the piece — try a few candidate offsets and pick
  // one that doesn't go off-board.
  const offsets = [
    { dx: SQ * 0.55, dy: -SQ * 0.55 },
    { dx: -SQ * 0.55, dy: -SQ * 0.55 },
    { dx: SQ * 0.55, dy: SQ * 0.55 },
    { dx: -SQ * 0.55, dy: SQ * 0.55 },
  ];
  // Bubble grows with defended count.
  const w = 38 + defendedPieces.length * 22;
  const h = 38;
  let bx, by;
  for (const o of offsets) {
    bx = center.x + o.dx - w / 2;
    by = center.y + o.dy - h / 2;
    if (bx > 4 && bx + w < 720 - 4 && by > 4 && by + h < 720 - 4) break;
  }

  const g = group();

  // Tail (little circles fading from piece to bubble — thought-bubble style)
  const tailSteps = 3;
  for (let s = 1; s <= tailSteps; s++) {
    const t = s / (tailSteps + 1);
    const tx = center.x + (bx + w / 2 - center.x) * t;
    const ty = center.y + (by + h / 2 - center.y) * t;
    const r = 3 + s * 1.5;
    const c = el('circle', { cx: tx, cy: ty, r, fill: 'rgba(255,255,255,0.92)', stroke: '#333', 'stroke-width': 1 });
    g.appendChild(c);
  }

  // Bubble
  const bubble = el('rect', {
    x: bx, y: by, width: w, height: h, rx: h / 2, ry: h / 2,
    fill: overload ? 'rgba(255, 235, 230, 0.96)' : 'rgba(255,255,255,0.95)',
    stroke: overload ? '#d04040' : '#333', 'stroke-width': overload ? 2 : 1.2,
  });
  g.appendChild(bubble);

  // Defended piece glyphs inside the bubble
  for (let k = 0; k < defendedPieces.length; k++) {
    const dp = defendedPieces[k];
    const gx = bx + 14 + k * 22;
    const gy = by + h / 2;
    const t = el('text', {
      x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 24, fill: dp.color === 'w' ? '#fff' : '#222', stroke: dp.color === 'w' ? '#222' : '#fff',
      'stroke-width': 1.5, 'paint-order': 'stroke',
      'font-family': '"Noto Sans Symbols 2", "DejaVu Sans", "Segoe UI Symbol", sans-serif',
    });
    t.textContent = GLYPH[dp.color][dp.piece];
    g.appendChild(t);
  }

  // Overloaded — add a sweat drop emoji-like shape.
  if (overload) {
    const sx = bx + w - 4, sy = by - 4;
    const drop = el('path', {
      d: `M ${sx} ${sy} q -6 8 -2 14 q 6 4 8 -2 q 0 -8 -6 -12 Z`,
      fill: '#4aa6e8', stroke: '#1565a8', 'stroke-width': 1,
    });
    g.appendChild(drop);
  }

  layer.appendChild(g);
}

export const DEFAULTS = { sideFilter: 'both' };
export const NAME = 'Thought bubbles';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white</option><option value="b">black</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });
  root.append(sideLabel);
}
export function legendHTML() {
  return `
    <div>Each piece "thinks about" the friendly pieces it defends. Bubbles grow with how much value is at stake.</div>
    <div style="margin-top: 8px;">A bubble outlined in red with a blue sweat drop = the piece is <b>overloaded</b> (high combined value of defended pieces). That piece is a juicy target for tactics.</div>
  `;
}
