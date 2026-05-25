// Visualization 5: fork-pattern recognition (no knights).
// We hide the knights from the board and instead scan every empty (non-knight) square,
// asking "if a knight were here, would it attack 2+ enemy pieces?". Every such square
// gets a constellation drawn: a centre disc, eight small L-position dots, and dashed lines
// to the actual forked targets. The point is to train the eye to recognize the shape,
// independent of any particular knight currently on the board.

import { parseFEN, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, SQ, el } from './board.js';

const COLOR_W = '#db2777'; // forks against black, drawn in white-knight pink
const COLOR_B = '#1e3a8a'; // forks against white, drawn in black-knight navy

const KNIGHT_OFFSETS = [[+1,+2],[+2,+1],[+2,-1],[+1,-2],[-1,-2],[-2,-1],[-2,+1],[-1,+2]];

function knightSquares(idx) {
  const f = fileOf(idx), r = rankOf(idx);
  const out = [];
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const nf = f + df, nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    out.push(nf + (7 - nr) * 8);
  }
  return out;
}

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  // Hide knights from the board; this viz is intentionally about the abstract pattern.
  const renderableBoard = board.map(p => (p && p.piece === 'N') ? null : p);

  for (let i = 0; i < 64; i++) {
    // Only consider squares where a knight could actually be placed (empty squares, or
    // squares that currently hold a knight we're hiding).
    const occ = board[i];
    if (occ && occ.piece !== 'N') continue;

    if (controls.target === 'both' || controls.target === 'w') {
      const targets = knightSquares(i).filter(sq => {
        const p = board[sq];
        return p && p.color === 'w' && p.piece !== 'N';
      });
      if (targets.length >= 2) drawForkPattern(layers.attack, i, targets, COLOR_B);
    }
    if (controls.target === 'both' || controls.target === 'b') {
      const targets = knightSquares(i).filter(sq => {
        const p = board[sq];
        return p && p.color === 'b' && p.piece !== 'N';
      });
      if (targets.length >= 2) drawForkPattern(layers.attack, i, targets, COLOR_W);
    }
  }

  renderPieces(layers.pieces, renderableBoard);
}

function drawForkPattern(layer, center, targets, color) {
  const c = squareCenter(center);

  // Centre disc, the "if a knight were here" marker.
  layer.appendChild(el('circle', {
    cx: c.x, cy: c.y, r: SQ * 0.16,
    fill: color, opacity: 0.85, stroke: '#fff', 'stroke-width': 2,
  }));

  // Eight L-position dots so the knight's reach pattern is always visible as a constellation.
  for (const sq of knightSquares(center)) {
    const p = squareCenter(sq);
    const hit = targets.includes(sq);
    layer.appendChild(el('circle', {
      cx: p.x, cy: p.y,
      r: hit ? SQ * 0.10 : SQ * 0.045,
      fill: color,
      opacity: hit ? 0.85 : 0.35,
      stroke: hit ? '#fff' : 'none', 'stroke-width': hit ? 1.5 : 0,
    }));
  }

  // Dashed lines from the centre to each actual target.
  for (const sq of targets) {
    const p = squareCenter(sq);
    layer.appendChild(el('line', {
      x1: c.x, y1: c.y, x2: p.x, y2: p.y,
      stroke: color, 'stroke-width': 2, opacity: 0.5,
      'stroke-dasharray': '3 4', 'stroke-linecap': 'round',
    }));
  }
}

export const DEFAULTS = { target: 'both' };
export const NAME = 'Fork patterns';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const tLabel = document.createElement('label');
  tLabel.innerHTML = `Show forks against <select><option value="both">both sides</option><option value="w">white pieces</option><option value="b">black pieces</option></select>`;
  const sel = tLabel.querySelector('select');
  sel.value = state.target;
  sel.addEventListener('change', () => { state.target = sel.value; onChange(); });
  root.append(tLabel);
}
export function legendHTML() {
  return `
    <div>Knights are hidden on purpose, this viz is about the abstract L-pattern. For every empty square, we check whether a hypothetical knight placed there would attack 2+ enemy pieces (ignoring knights as targets too).</div>
    <div style="margin-top: 6px;">Each pattern: a coloured disc on the "if a knight were here" square, eight small dots showing the eight L-positions, big dots on the actually-hit pieces, dashed lines from the centre to each target.</div>
    <div style="margin-top: 6px;">Pink = white-knight forks (against black). Navy = black-knight forks (against white).</div>
  `;
}
