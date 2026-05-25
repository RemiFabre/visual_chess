// Visualization 4: in-square defender summary.
// Inside each piece's own square, two narrow strips:
//   TOP    = "who defends me"      (small letter chips, color = defender's side)
//   BOTTOM = "who I defend"        (same, but listing the friends I shield)
// A sad-face indicator overlays a piece that is attacked AND has zero defenders (hanging).

import { parseFEN, computeDefendedMap, computeControl, pieceValue } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el, group } from './board.js';
import { pieceImageUrl } from './board.js';

const PIECE_LETTER = { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' };

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { defenders, defending } = computeDefendedMap(board);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  renderPieces(layers.pieces, board);

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;

    // Filter king out of the defended-targets list — the king isn't a real defense target.
    const myDefenders = defenders[i].filter(j => board[j].piece !== 'K');
    const myDefendees = defending[i].filter(j => board[j].piece !== 'K');

    const { x, y } = squareXY(i);

    // TOP strip — defenders of *me*.
    if (controls.showDefenders && myDefenders.length > 0) {
      drawBadgeRow(layers.bubbles, x, y + 2, myDefenders.map(j => board[j]), 'top');
    }
    // BOTTOM strip — friends *I* defend.
    if (controls.showDefending && myDefendees.length > 0) {
      drawBadgeRow(layers.bubbles, x, y + SQ - 16, myDefendees.map(j => board[j]), 'bottom');
    }

    // Sad face if hanging (attacked & no defenders, not the king).
    if (p.piece !== 'K') {
      const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
      const hanging = enemy > 0 && myDefenders.length === 0;
      if (hanging && controls.showHanging) drawSadFace(layers.bubbles, x, y);
    }
  }
}

// One row of small chips inside a square. Each chip is a small rounded square with a piece letter.
// Color = defender's side (orange = white, blue = black).
function drawBadgeRow(layer, x, y, pieces, position) {
  const max = 4;
  const list = pieces.slice(0, max);
  const chipW = 14;
  const chipH = 14;
  const gap = 2;
  const totalW = list.length * chipW + (list.length - 1) * gap;
  const startX = x + (SQ - totalW) / 2;

  const g = group();
  for (let k = 0; k < list.length; k++) {
    const dp = list[k];
    const cx = startX + k * (chipW + gap);
    const fillColor = dp.color === 'w' ? '#ff944d' : '#5a9be8';
    const r = el('rect', {
      x: cx, y, width: chipW, height: chipH, rx: 3, ry: 3,
      fill: fillColor, stroke: '#222', 'stroke-width': 1, opacity: 0.95,
    });
    g.appendChild(r);
    const t = el('text', {
      x: cx + chipW / 2, y: y + chipH / 2 + 1,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 10, 'font-weight': 700, fill: '#fff', stroke: '#222', 'stroke-width': 1.5, 'paint-order': 'stroke',
      'font-family': 'sans-serif',
    });
    t.textContent = PIECE_LETTER[dp.piece];
    g.appendChild(t);
  }

  // If we truncated, append a "+N" indicator
  if (pieces.length > max) {
    const overflow = pieces.length - max;
    const cx = startX + list.length * (chipW + gap);
    const t = el('text', {
      x: cx + 4, y: y + chipH / 2 + 1,
      'dominant-baseline': 'central', 'font-size': 10, 'font-weight': 700,
      fill: '#fff', stroke: '#222', 'stroke-width': 1.5, 'paint-order': 'stroke',
      'font-family': 'sans-serif',
    });
    t.textContent = `+${overflow}`;
    g.appendChild(t);
  }
  layer.appendChild(g);
}

function drawSadFace(layer, x, y) {
  // Small sad face in the top-right corner of the square.
  const cx = x + SQ - 14;
  const cy = y + 14;
  const r = 10;
  const g = group();
  const face = el('circle', { cx, cy, r, fill: '#ffd166', stroke: '#222', 'stroke-width': 1.5 });
  // eyes
  const eyeL = el('circle', { cx: cx - 3, cy: cy - 2, r: 1.2, fill: '#222' });
  const eyeR = el('circle', { cx: cx + 3, cy: cy - 2, r: 1.2, fill: '#222' });
  // sad mouth — frown
  const mouth = el('path', { d: `M ${cx - 3} ${cy + 4} Q ${cx} ${cy + 1} ${cx + 3} ${cy + 4}`, stroke: '#222', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' });
  g.appendChild(face);
  g.appendChild(eyeL);
  g.appendChild(eyeR);
  g.appendChild(mouth);
  layer.appendChild(g);
}

export const DEFAULTS = { sideFilter: 'both', showDefenders: true, showDefending: true, showHanging: true };
export const NAME = 'Defender badges';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white</option><option value="b">black</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });

  const mkToggle = (key, label) => {
    const l = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state[key];
    cb.addEventListener('change', () => { state[key] = cb.checked; onChange(); });
    l.append(cb, document.createTextNode(label));
    return l;
  };

  root.append(
    sideLabel,
    mkToggle('showDefenders', 'Show who defends each piece (top of square)'),
    mkToggle('showDefending', 'Show who each piece defends (bottom of square)'),
    mkToggle('showHanging', 'Show sad-face on hanging pieces'),
  );
}
export function legendHTML() {
  return `
    <div>Each chip shows one defender. Color = defender's side (orange = white, blue = black). The letter is the piece type.</div>
    <div style="margin-top: 8px;"><b>Top row</b> = pieces that defend this square. <b>Bottom row</b> = pieces this piece defends. Both fit entirely inside the square.</div>
    <div style="margin-top: 8px;">A yellow sad face means the piece is attacked but undefended — i.e., hanging.</div>
  `;
}
