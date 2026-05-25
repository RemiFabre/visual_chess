// Visualization 2: attack paths.
// All arrows use the same uniform style, solid until the first collision, dotted
// continuation past it for sliders (B/R/Q). Only knights stay curved (arc).

import { parseFEN, pieceAttackVectors, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, SQ, el } from './board.js';

const COLOR_W = '#db2777'; // hot pink for white
const COLOR_B = '#1e3a8a'; // navy for black

const WIDTH = 3.5;

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;
    if (controls.pieceFilter !== 'all' && controls.pieceFilter !== p.piece) continue;

    const color = p.color === 'w' ? COLOR_W : COLOR_B;
    const vectors = pieceAttackVectors(board, i);
    for (const v of vectors) {
      drawVector(layers.attack, board, i, v, color, p);
    }
  }

  renderPieces(layers.pieces, board);
}

function drawVector(layer, board, from, v, color, piece) {
  const center = squareCenter(from);

  // Knights, curved arc to the destination, no continuation past.
  if (v.type === 'jump') {
    const dest = squareCenter(v.to);
    drawArrow(layer, center.x, center.y, dest.x, dest.y, color, { curved: true, opacity: 0.85 });
    return;
  }
  // Pawn captures & king moves, single-square solid hop, no continuation past.
  if (v.type === 'pawn' || v.type === 'king') {
    const dest = squareCenter(v.to);
    const target = board[v.to];
    drawArrow(layer, center.x, center.y, dest.x, dest.y, color, { opacity: target ? 0.9 : 0.55 });
    return;
  }

  // Sliders, solid up to the first blocker, dotted continuation past.
  const rayCenters = v.ray.map(squareCenter);
  const blockerIdx = v.blockedBy != null ? v.ray.indexOf(v.blockedBy) : v.ray.length - 1;
  const solidEnd = rayCenters[blockerIdx];

  drawArrow(layer, center.x, center.y, solidEnd.x, solidEnd.y, color, { opacity: 0.85 });

  if (v.blockedBy != null && blockerIdx < v.ray.length - 1) {
    // Continue dotted from solidEnd outward along v.dir until the edge.
    const [df, dr] = v.dir;
    let f = fileOf(v.blockedBy), r = rankOf(v.blockedBy);
    let prev = solidEnd;
    while (true) {
      f += df; r += dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const next = squareCenter(f + (7 - r) * 8);
      const ln = el('line', {
        x1: prev.x, y1: prev.y, x2: next.x, y2: next.y,
        stroke: color, 'stroke-width': WIDTH * 0.8,
        'stroke-dasharray': '3 6', opacity: 0.55,
        'stroke-linecap': 'round',
      });
      layer.appendChild(ln);
      prev = next;
    }
  }
}

function drawArrow(layer, x1, y1, x2, y2, color, { opacity = 0.85, curved = false } = {}) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const shorten = SQ * 0.22;
  const sx = x2 - ux * shorten;
  const sy = y2 - uy * shorten;

  if (curved) {
    const mx = (x1 + sx) / 2 + uy * SQ * 0.30;
    const my = (y1 + sy) / 2 - ux * SQ * 0.30;
    const path = el('path', {
      d: `M ${x1} ${y1} Q ${mx} ${my} ${sx} ${sy}`,
      fill: 'none', stroke: color, 'stroke-width': WIDTH, opacity,
      'stroke-linecap': 'round',
    });
    layer.appendChild(path);
  } else {
    const ln = el('line', {
      x1, y1, x2: sx, y2: sy,
      stroke: color, 'stroke-width': WIDTH, opacity, 'stroke-linecap': 'round',
    });
    layer.appendChild(ln);
  }

  // Arrowhead
  const tipX = x2 - ux * shorten * 0.3;
  const tipY = y2 - uy * shorten * 0.3;
  const ah = SQ * 0.14;
  const px = -uy, py = ux;
  const arrow = el('polygon', {
    points: `${tipX},${tipY} ${tipX - ux * ah + px * ah * 0.55},${tipY - uy * ah + py * ah * 0.55} ${tipX - ux * ah - px * ah * 0.55},${tipY - uy * ah - py * ah * 0.55}`,
    fill: color, opacity,
  });
  layer.appendChild(arrow);
}

export const DEFAULTS = { sideFilter: 'both', pieceFilter: 'all' };
export const NAME = 'Attack paths';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white</option><option value="b">black</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });

  const pieceLabel = document.createElement('label');
  pieceLabel.innerHTML = `Piece <select><option value="all">all</option><option value="P">pawns</option><option value="N">knights</option><option value="B">bishops</option><option value="R">rooks</option><option value="Q">queens</option><option value="K">kings</option></select>`;
  const pieceSelect = pieceLabel.querySelector('select');
  pieceSelect.value = state.pieceFilter;
  pieceSelect.addEventListener('change', () => { state.pieceFilter = pieceSelect.value; onChange(); });

  root.append(sideLabel, pieceLabel);
}
export function legendHTML() {
  return `
    <div>Solid arrow = attack up to the first piece in the way. Dotted continuation = the rest of the ray (what the slider would attack if the blocker moved).</div>
    <div style="margin-top: 8px;">All arrows use the same style; only knights are curved (because their move isn't a straight line).</div>
    <div style="margin-top: 8px;">Use the side &amp; piece filters above to declutter the opening positions.</div>
  `;
}
