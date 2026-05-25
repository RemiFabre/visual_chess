// Visualization 1: controlled-space heatmap.
// Each square gets shaded by who controls it (one or both sides) and how strongly (attacker count).

import { parseFEN, computeControl } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el } from './board.js';

const WHITE_COLOR = [232, 152, 90];   // matches --white-side
const BLACK_COLOR = [90, 155, 232];   // matches --black-side

const MAX_INTENSITY = 4; // cap

function rgba([r, g, b], a) { return `rgba(${r}, ${g}, ${b}, ${a})`; }
function intensityToAlpha(count) {
  // 0 -> 0, 1 -> 0.25, 2 -> 0.45, 3 -> 0.65, 4+ -> 0.85
  if (count <= 0) return 0;
  const c = Math.min(count, MAX_INTENSITY);
  return 0.20 + (c - 1) * 0.20;
}

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  // Heatmap rectangles
  for (let i = 0; i < 64; i++) {
    const { w, b } = ctrl[i];
    const wn = w.length, bn = b.length;
    const { x, y } = squareXY(i);

    if (wn === 0 && bn === 0) continue;
    if (wn > 0 && bn === 0) {
      const rect = el('rect', { x, y, width: SQ, height: SQ, fill: rgba(WHITE_COLOR, intensityToAlpha(wn)) });
      layers.control.appendChild(rect);
    } else if (bn > 0 && wn === 0) {
      const rect = el('rect', { x, y, width: SQ, height: SQ, fill: rgba(BLACK_COLOR, intensityToAlpha(bn)) });
      layers.control.appendChild(rect);
    } else {
      // Contested square: triangle split — white top-left triangle, black bottom-right.
      // Each gets its own intensity.
      const half1 = el('polygon', {
        points: `${x},${y} ${x + SQ},${y} ${x},${y + SQ}`,
        fill: rgba(WHITE_COLOR, intensityToAlpha(wn)),
      });
      const half2 = el('polygon', {
        points: `${x + SQ},${y} ${x + SQ},${y + SQ} ${x},${y + SQ}`,
        fill: rgba(BLACK_COLOR, intensityToAlpha(bn)),
      });
      layers.control.appendChild(half1);
      layers.control.appendChild(half2);
    }

    // Numeric counts (small) in opposing corners if both > 0, else center-ish
    if (controls.showCounts) {
      if (wn > 0) addCount(layers.control, x + 6, y + 16, wn, WHITE_COLOR);
      if (bn > 0) addCount(layers.control, x + SQ - 6, y + SQ - 6, bn, BLACK_COLOR, 'end');
    }
  }

  renderPieces(layers.pieces, board);
}

function addCount(layer, x, y, n, rgb, anchor = 'start') {
  const t = el('text', {
    x, y, fill: rgba(rgb, 1),
    stroke: 'rgba(0,0,0,0.7)', 'stroke-width': 2.5, 'paint-order': 'stroke',
    'font-size': 14, 'font-weight': 700, 'text-anchor': anchor,
    'font-family': 'sans-serif',
  });
  t.textContent = String(n);
  layer.appendChild(t);
}

export const DEFAULTS = { showCounts: true };
export const NAME = 'Controlled space';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const label = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = state.showCounts;
  cb.addEventListener('change', () => { state.showCounts = cb.checked; onChange(); });
  label.append(cb, document.createTextNode('Show attacker counts'));
  root.appendChild(label);
}
export function legendHTML() {
  return `
    <div><span class="swatch" style="background: rgba(232,152,90,0.6)"></span>White controls (intensity = # attackers)</div>
    <div><span class="swatch" style="background: rgba(90,155,232,0.6)"></span>Black controls</div>
    <div><span class="swatch" style="background: linear-gradient(135deg, rgba(232,152,90,0.6) 50%, rgba(90,155,232,0.6) 50%)"></span>Contested (both sides attack)</div>
    <div style="margin-top: 8px;">Counts cap at <code>4</code>. Numbers in corners = attacker count per side.</div>
  `;
}
