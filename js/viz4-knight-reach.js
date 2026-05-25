// Visualization 4: knight reach.
// For ONE knight (chosen by the side filter, first knight of that color), BFS its reachable
// squares for 1, 2 and 3 moves. Shade each square in the side's color, intensity by distance,
// plus a small digit in the corner.
// Helps internalize how far a knight can travel and where its outposts dominate.

import { parseFEN, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el } from './board.js';

const COLOR_W = [219, 39, 119]; // pink
const COLOR_B = [30, 58, 138];  // navy
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

function bfsReach(start, maxDepth) {
  const dist = new Map();
  dist.set(start, 0);
  let frontier = [start];
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const idx of frontier) {
      for (const sq of knightSquares(idx)) {
        if (!dist.has(sq)) {
          dist.set(sq, d);
          next.push(sq);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

function findKnights(board, color) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.piece === 'N' && p.color === color) out.push(i);
  }
  return out;
}

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  const knights = findKnights(board, controls.side);
  if (knights.length === 0) {
    renderPieces(layers.pieces, board);
    return;
  }

  // Pick which knight by index (clamped to range)
  const idx = Math.min(controls.knightIdx ?? 0, knights.length - 1);
  const knightSq = knights[idx];
  const colorRgb = controls.side === 'w' ? COLOR_W : COLOR_B;

  // Highlight the knight's own square subtly so we know where we're starting from.
  const { x: ksx, y: ksy } = squareXY(knightSq);
  layers.attack.appendChild(el('rect', {
    x: ksx, y: ksy, width: SQ, height: SQ,
    fill: 'none', stroke: `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.9)`,
    'stroke-width': 4, 'stroke-dasharray': '6 4',
  }));

  const distances = bfsReach(knightSq, 3);
  for (const [sq, d] of distances.entries()) {
    if (d === 0) continue;
    drawReachSquare(layers.attack, sq, d, colorRgb);
  }

  renderPieces(layers.pieces, board);
}

function drawReachSquare(layer, sq, depth, colorRgb) {
  const { x, y } = squareXY(sq);
  const alpha = depth === 1 ? 0.42 : depth === 2 ? 0.26 : 0.13;
  layer.appendChild(el('rect', {
    x, y, width: SQ, height: SQ,
    fill: `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, ${alpha})`,
  }));
  const t = el('text', {
    x: x + SQ - 6, y: y + SQ - 6,
    fill: `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 1)`,
    'font-size': 14, 'font-weight': 500, 'text-anchor': 'end',
    'font-family': 'sans-serif',
  });
  t.textContent = String(depth);
  layer.appendChild(t);
}

export const DEFAULTS = { side: 'w', knightIdx: 0 };
export const NAME = 'Knight reach';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="w">white knights</option><option value="b">black knights</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.side;
  sideSelect.addEventListener('change', () => { state.side = sideSelect.value; state.knightIdx = 0; onChange(); });

  const idxLabel = document.createElement('label');
  idxLabel.innerHTML = `Knight # <input type="number" min="0" value="${state.knightIdx ?? 0}" style="width:60px;">`;
  const input = idxLabel.querySelector('input');
  input.addEventListener('change', () => { state.knightIdx = Math.max(0, parseInt(input.value, 10) || 0); onChange(); });

  root.append(sideLabel, idxLabel);
}
export function legendHTML() {
  return `
    <div>For the selected knight (dashed ring marks its current square), we BFS the squares it can reach in 1, 2 or 3 moves.</div>
    <div style="margin-top: 6px;">Darker shade and lower number = closer; lighter shade and higher number = farther. The digit in the corner is the move count.</div>
    <div style="margin-top: 6px;">When a side has more than one knight, the <code>Knight #</code> control picks which one (0, 1, ...).</div>
  `;
}
