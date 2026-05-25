// Visualization 2: attack paths.
// Each piece gets its attack vectors drawn. Sliders show solid line to first collision,
// dotted continuation behind the collision. Piece-specific styles distinguish lines.

import { parseFEN, pieceAttackVectors, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, squareXY, SQ, el } from './board.js';

// Each side renders in its own color; piece type tweaks dash / width / decoration.
const STYLES = {
  w: { color: '#ff8a52' },
  b: { color: '#52a0ff' },
};
const PIECE_STYLE = {
  P: { width: 3,  dash: null },
  N: { width: 3,  dash: null,  marker: 'arc' },    // knights get a curved indicator
  B: { width: 3,  dash: null },
  R: { width: 4,  dash: null },
  Q: { width: 4,  dash: '6 4' },                   // queen: slight stripe to read it apart
  K: { width: 2,  dash: '2 3' },                   // king: short dashes (low reach)
};

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;
    if (controls.pieceFilter !== 'all' && controls.pieceFilter !== p.piece) continue;

    const color = STYLES[p.color].color;
    const style = PIECE_STYLE[p.piece] || PIECE_STYLE.P;

    const vectors = pieceAttackVectors(board, i);
    for (const v of vectors) {
      drawVector(layers.attack, board, i, v, color, style, p);
    }
  }

  renderPieces(layers.pieces, board);
}

function drawVector(layer, board, from, v, color, style, piece) {
  const center = squareCenter(from);

  if (v.type === 'jump' || v.type === 'pawn' || v.type === 'king') {
    // Single-square hop. Render an arrow head.
    const dest = squareCenter(v.to);
    const target = board[v.to];
    drawArrow(layer, center.x, center.y, dest.x, dest.y, {
      color, width: style.width, dash: style.dash, opacity: target ? 1 : 0.6,
      curved: style.marker === 'arc',
    });
    return;
  }

  // Slider ray. Solid from `from` through ray squares until blocker; dotted beyond.
  // The ray array contains every square along the direction (the blocker square is included).
  const rayCenters = v.ray.map(squareCenter);
  const blockerIdx = v.blockedBy != null ? v.ray.indexOf(v.blockedBy) : v.ray.length - 1;

  // Solid portion: from `center` to the blocker square's center.
  const solidEnd = rayCenters[blockerIdx];
  drawArrow(layer, center.x, center.y, solidEnd.x, solidEnd.y, {
    color, width: style.width, dash: style.dash, opacity: 0.85,
  });

  // Dotted continuation past the blocker (only for sliders that hit something).
  if (v.blockedBy != null && blockerIdx < v.ray.length - 1) {
    // Continue in the same direction until edge.
    // The remaining ray squares we already truncated at blocker, so extend manually one step.
    // Easier: continue until the edge along v.dir.
    const [df, dr] = v.dir;
    let f = fileOf(v.blockedBy), r = rankOf(v.blockedBy);
    let prev = solidEnd;
    while (true) {
      f += df; r += dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const next = squareCenter(f + (7 - r) * 8);
      const ln = el('line', {
        x1: prev.x, y1: prev.y, x2: next.x, y2: next.y,
        stroke: color, 'stroke-width': style.width * 0.75,
        'stroke-dasharray': '3 6', opacity: 0.5,
      });
      layer.appendChild(ln);
      prev = next;
    }
  }
}

function drawArrow(layer, x1, y1, x2, y2, { color, width, dash, opacity, curved }) {
  // Shorten the line slightly so the arrowhead doesn't overflow the target square.
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const shorten = SQ * 0.25;
  const sx = x2 - ux * shorten;
  const sy = y2 - uy * shorten;

  if (curved) {
    // Curved arc — used for knight jumps. Quadratic curve with a perpendicular bulge.
    const mx = (x1 + sx) / 2 + uy * SQ * 0.35;
    const my = (y1 + sy) / 2 - ux * SQ * 0.35;
    const path = el('path', {
      d: `M ${x1} ${y1} Q ${mx} ${my} ${sx} ${sy}`,
      fill: 'none', stroke: color, 'stroke-width': width, opacity,
      ...(dash ? { 'stroke-dasharray': dash } : {}),
    });
    layer.appendChild(path);
  } else {
    const ln = el('line', {
      x1, y1, x2: sx, y2: sy,
      stroke: color, 'stroke-width': width, opacity,
      ...(dash ? { 'stroke-dasharray': dash } : {}),
      'stroke-linecap': 'round',
    });
    layer.appendChild(ln);
  }

  // Arrowhead — small filled triangle pointing along direction.
  const tipX = x2 - ux * shorten * 0.4;
  const tipY = y2 - uy * shorten * 0.4;
  const ah = SQ * 0.16;
  const px = -uy, py = ux;
  const arrow = el('polygon', {
    points: `${tipX},${tipY} ${tipX - ux * ah + px * ah * 0.5},${tipY - uy * ah + py * ah * 0.5} ${tipX - ux * ah - px * ah * 0.5},${tipY - uy * ah - py * ah * 0.5}`,
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
    <div>Solid line = attack up to first collision. Dotted past it = "what's behind" along the same ray.</div>
    <div style="margin-top: 8px;">Each piece type has a slightly different stroke (knight arcs, queen striped, king dashed short) so the lines stay readable when they overlap.</div>
  `;
}
