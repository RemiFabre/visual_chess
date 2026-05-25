// Visualization 2: attack paths.
// Each piece type has its own shape so we can read the board at a glance:
//   - Pawn: short, thick stub that barely enters the target diagonal. Pawn protection is chunky.
//   - King: shuriken spokes radiating only inside (and just past) the king's own square. Low range.
//   - Bishop / Rook / Queen: thin straight line, solid up to the first collision, dotted continuation
//     to the board edge so we can still see what the slider would attack if the blocker moved.
//   - Knight: not drawn (we tried curved arcs, they clutter too much; revisit later).

import { parseFEN, pieceAttackVectors, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, SQ, el } from './board.js';

const COLOR_W = '#db2777';
const COLOR_B = '#1e3a8a';

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

    switch (p.piece) {
      case 'P':
        drawPawn(layers.attack, board, i, color);
        break;
      case 'N':
        // Intentionally not drawn. Knight arrows added too much noise in the opening.
        break;
      case 'K':
        drawKing(layers.attack, board, i, color);
        break;
      case 'B':
      case 'R':
      case 'Q':
        drawSlider(layers.attack, board, i, color);
        break;
    }
  }

  renderPieces(layers.pieces, board);
}

// Pawn: thick stub from pawn center to ~55% of the way to each diagonal target,
// so the visible end (with round caps) just crosses into the target square.
function drawPawn(layer, board, from, color) {
  const p = board[from];
  const f = fileOf(from), r = rankOf(from);
  const dir = p.color === 'w' ? +1 : -1;
  const center = squareCenter(from);

  for (const df of [-1, +1]) {
    const nf = f + df, nr = r + dir;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const targetIdx = nf + (7 - nr) * 8;
    const target = squareCenter(targetIdx);

    const fraction = 0.55;
    const ex = center.x + (target.x - center.x) * fraction;
    const ey = center.y + (target.y - center.y) * fraction;

    const stub = el('line', {
      x1: center.x, y1: center.y, x2: ex, y2: ey,
      stroke: color, 'stroke-width': 12, opacity: 0.92, 'stroke-linecap': 'round',
    });
    layer.appendChild(stub);
  }
}

// King: small star pattern. One spoke per actually-attacked direction, all contained near the
// king's own square so the king doesn't add 8 short lines to the board.
function drawKing(layer, board, from, color) {
  const center = squareCenter(from);
  const innerR = SQ * 0.30;
  const outerR = SQ * 0.48;

  const vectors = pieceAttackVectors(board, from);
  for (const v of vectors) {
    if (v.type !== 'king') continue;
    const target = squareCenter(v.to);
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;

    const x1 = center.x + ux * innerR;
    const y1 = center.y + uy * innerR;
    const x2 = center.x + ux * outerR;
    const y2 = center.y + uy * outerR;

    const ln = el('line', {
      x1, y1, x2, y2,
      stroke: color, 'stroke-width': 3, opacity: 0.85, 'stroke-linecap': 'round',
    });
    layer.appendChild(ln);
  }
}

// Slider: per ray, solid to first collision (or edge), then dotted past it to the board edge.
function drawSlider(layer, board, from, color) {
  const center = squareCenter(from);
  const vectors = pieceAttackVectors(board, from);

  for (const v of vectors) {
    if (v.type !== 'ray') continue;

    const rayCenters = v.ray.map(squareCenter);
    const blockerIdx = v.blockedBy != null ? v.ray.indexOf(v.blockedBy) : v.ray.length - 1;
    const solidEnd = rayCenters[blockerIdx];

    const solid = el('line', {
      x1: center.x, y1: center.y, x2: solidEnd.x, y2: solidEnd.y,
      stroke: color, 'stroke-width': 3, opacity: 0.9, 'stroke-linecap': 'round',
    });
    layer.appendChild(solid);

    // Dotted continuation past the blocker, all the way to the board edge.
    // (The ray itself ends AT the blocker square; we keep walking the direction beyond it.)
    if (v.blockedBy != null) {
      const [df, dr] = v.dir;
      let f = fileOf(v.blockedBy), r = rankOf(v.blockedBy);
      let prev = solidEnd;
      while (true) {
        f += df; r += dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) break;
        const next = squareCenter(f + (7 - r) * 8);
        const dotted = el('line', {
          x1: prev.x, y1: prev.y, x2: next.x, y2: next.y,
          stroke: color, 'stroke-width': 2.5, opacity: 0.55,
          'stroke-dasharray': '4 5', 'stroke-linecap': 'round',
        });
        layer.appendChild(dotted);
        prev = next;
      }
    }
  }
}

export const DEFAULTS = { sideFilter: 'both', pieceFilter: 'all' };
export const NAME = 'Sight';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white</option><option value="b">black</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });

  const pieceLabel = document.createElement('label');
  pieceLabel.innerHTML = `Piece <select><option value="all">all</option><option value="P">pawns</option><option value="B">bishops</option><option value="R">rooks</option><option value="Q">queens</option><option value="K">kings</option></select>`;
  const pieceSelect = pieceLabel.querySelector('select');
  pieceSelect.value = state.pieceFilter;
  pieceSelect.addEventListener('change', () => { state.pieceFilter = pieceSelect.value; onChange(); });

  root.append(sideLabel, pieceLabel);
}
export function legendHTML() {
  return `
    <div><b>Pawn:</b> thick stub barely crossing into each diagonal target. A pawn's protection is a chunky, solid thing.</div>
    <div style="margin-top: 6px;"><b>King:</b> shuriken spokes inside its own square. Short range, no clutter in the eight neighbours.</div>
    <div style="margin-top: 6px;"><b>Bishop / Rook / Queen:</b> straight line, solid up to the first piece in the way, dotted continuation to the board edge so we see what the slider <i>would</i> attack if the blocker moved.</div>
    <div style="margin-top: 6px;"><b>Knight:</b> not drawn for now. The arcs read fine in isolation but compound too much in the opening.</div>
  `;
}
