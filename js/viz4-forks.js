// Visualization 4: knight reach + fork detection.
//
// For every knight on the board:
//   - Small colored dot on each square the knight could move to (its 8 L-jumps, minus squares
//     occupied by friendly pieces).
//   - For each landing square, count how many enemy pieces the knight would attack from there.
//     If that's 2 or more, the square is a FORK SQUARE. Big warning ring + dashed lines from the
//     fork square out to each forked piece.
//   - If the landing square already holds an enemy piece, that capture counts toward the fork
//     count too (capture + threat is still a "we lose two things" move).
//
// Use this to spot forks we could play, and forks the opponent could play against us.

import { parseFEN, fileOf, rankOf } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, SQ, el } from './board.js';

const COLOR_W = '#db2777';
const COLOR_B = '#1e3a8a';
const FORK_FILL = 'rgba(250, 204, 21, 0.55)';
const FORK_RING = '#dc2626';

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

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.piece !== 'N') continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;

    const color = p.color === 'w' ? COLOR_W : COLOR_B;
    const enemyColor = p.color === 'w' ? 'b' : 'w';

    const destinations = knightSquares(i).filter(dst => {
      const occ = board[dst];
      return !occ || occ.color !== p.color;
    });

    for (const dst of destinations) {
      const dstAttacks = knightSquares(dst);
      const enemiesHit = [];
      // If the move is a capture, count the captured piece as a "hit" as well.
      if (board[dst] && board[dst].color === enemyColor) {
        enemiesHit.push({ idx: dst, captured: true });
      }
      for (const sq of dstAttacks) {
        if (sq === i) continue;
        const occ = board[sq];
        if (occ && occ.color === enemyColor) enemiesHit.push({ idx: sq, captured: false });
      }

      const isFork = enemiesHit.length >= 2;
      if (isFork) {
        drawForkSquare(layers.attack, dst, enemiesHit);
      } else if (controls.showReach) {
        drawReachDot(layers.attack, dst, color);
      }
    }
  }

  renderPieces(layers.pieces, board);
}

function drawReachDot(layer, dst, color) {
  const c = squareCenter(dst);
  const dot = el('circle', {
    cx: c.x, cy: c.y, r: SQ * 0.10,
    fill: color, opacity: 0.55,
  });
  layer.appendChild(dot);
}

function drawForkSquare(layer, dst, enemiesHit) {
  const c = squareCenter(dst);

  // Yellow disc + red ring under the knight target so it's impossible to miss.
  const disc = el('circle', {
    cx: c.x, cy: c.y, r: SQ * 0.36,
    fill: FORK_FILL, stroke: FORK_RING, 'stroke-width': 4,
  });
  layer.appendChild(disc);

  // Dashed lines from the fork square to each enemy that would be attacked.
  // Solid line if the move is a capture of that piece (we *take* it on the way),
  // dashed otherwise (we *threaten* it).
  for (const enemy of enemiesHit) {
    const ec = squareCenter(enemy.idx);
    const attrs = {
      x1: c.x, y1: c.y, x2: ec.x, y2: ec.y,
      stroke: FORK_RING, 'stroke-width': 2.5, opacity: 0.75,
      'stroke-linecap': 'round',
    };
    if (!enemy.captured) attrs['stroke-dasharray'] = '5 5';
    const ln = el('line', attrs);
    layer.appendChild(ln);
  }
}

export const DEFAULTS = { sideFilter: 'both', showReach: true };
export const NAME = 'Knight forks';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white knights</option><option value="b">black knights</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });

  const reachLabel = document.createElement('label');
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state.showReach;
  cb.addEventListener('change', () => { state.showReach = cb.checked; onChange(); });
  reachLabel.append(cb, document.createTextNode('Show all reachable squares (small dots)'));

  root.append(sideLabel, reachLabel);
}
export function legendHTML() {
  return `
    <div>For every knight on the board, we look at the 8 squares it could jump to next turn.</div>
    <div style="margin-top: 6px;"><span class="swatch" style="background:#db2777"></span><span class="swatch" style="background:#1e3a8a"></span> small dot = a square the knight could move to. Side colour matches the knight.</div>
    <div style="margin-top: 6px;"><span class="swatch" style="background: rgba(250,204,21,0.55); border: 2px solid #dc2626"></span> yellow disc + red ring = a <b>fork square</b>: moving the knight here would attack 2+ enemy pieces simultaneously.</div>
    <div style="margin-top: 6px;">From the fork square, dashed lines go to each piece that would be threatened; a solid line means the fork move also captures that piece.</div>
  `;
}
