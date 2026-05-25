// Visualization 1: controlled-space, two modes.
//   - "borders": square color unchanged; each square gets colored INSET borders.
//     If only one side attacks → all 4 borders that color.
//     If both attack → top+right = side with more attackers (or white if tied), bottom+left = the other side.
//     Stroke width scales with that side's attacker count.
//   - "numbers": no colors at all, just attacker-count digits in opposing corners.
//
// "Show counts" toggle adds numeric badges in the corners on top of the borders.

import { parseFEN, computeControl } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el } from './board.js';

const WHITE_RGB = [232, 152, 90];
const BLACK_RGB = [90, 155, 232];
const MAX_INT = 4;

function rgb([r, g, b], a = 1) { return `rgba(${r}, ${g}, ${b}, ${a})`; }

function widthFor(n) {
  // Maps attacker count → stroke width in px.
  if (n <= 0) return 0;
  return Math.min(2.5 + (n - 1) * 1.8, 2.5 + (MAX_INT - 1) * 1.8); // 2.5, 4.3, 6.1, 7.9
}

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  if (controls.mode === 'borders') {
    drawBorders(layers.control, ctrl);
  }

  if (controls.showCounts) {
    drawCounts(layers.control, ctrl);
  }

  renderPieces(layers.pieces, board);
}

function drawBorders(layer, ctrl) {
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i);

    if (wn > 0 && bn === 0) drawFullBorder(layer, x, y, WHITE_RGB, widthFor(wn));
    else if (bn > 0 && wn === 0) drawFullBorder(layer, x, y, BLACK_RGB, widthFor(bn));
    else drawSplitBorder(layer, x, y, wn, bn);
  }
}

function drawFullBorder(layer, x, y, color, width) {
  // Inset the rect by half-width so the stroke is fully inside the square.
  const inset = width / 2 + 0.5;
  const r = el('rect', {
    x: x + inset, y: y + inset, width: SQ - 2 * inset, height: SQ - 2 * inset,
    fill: 'none', stroke: rgb(color), 'stroke-width': width, 'stroke-linejoin': 'miter',
  });
  layer.appendChild(r);
}

function drawSplitBorder(layer, x, y, wn, bn) {
  // Top + right = white, bottom + left = black.
  // Each pair gets its own stroke width.
  const wWidth = widthFor(wn);
  const bWidth = widthFor(bn);
  const wInset = wWidth / 2 + 0.5;
  const bInset = bWidth / 2 + 0.5;

  // Use polyline for each L-shape.
  // Top + right (white):
  const wPath = el('polyline', {
    points: `${x + bInset},${y + wInset} ${x + SQ - wInset},${y + wInset} ${x + SQ - wInset},${y + SQ - bInset}`,
    fill: 'none', stroke: rgb(WHITE_RGB), 'stroke-width': wWidth, 'stroke-linejoin': 'miter',
  });
  // Bottom + left (black):
  const bPath = el('polyline', {
    points: `${x + SQ - wInset},${y + SQ - bInset} ${x + bInset},${y + SQ - bInset} ${x + bInset},${y + wInset}`,
    fill: 'none', stroke: rgb(BLACK_RGB), 'stroke-width': bWidth, 'stroke-linejoin': 'miter',
  });
  layer.appendChild(wPath);
  layer.appendChild(bPath);
}

function drawCounts(layer, ctrl) {
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i);
    if (wn > 0) addCount(layer, x + 8, y + 16, wn, WHITE_RGB, 'start');
    if (bn > 0) addCount(layer, x + SQ - 8, y + SQ - 8, bn, BLACK_RGB, 'end');
  }
}

function addCount(layer, x, y, n, rgbArr, anchor) {
  const t = el('text', {
    x, y,
    fill: rgb(rgbArr),
    stroke: 'rgba(0,0,0,0.85)', 'stroke-width': 3, 'paint-order': 'stroke',
    'font-size': 16, 'font-weight': 800, 'text-anchor': anchor,
    'font-family': 'sans-serif',
  });
  t.textContent = String(n);
  layer.appendChild(t);
}

export const DEFAULTS = { mode: 'borders', showCounts: true };
export const NAME = 'Controlled space';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';

  const mkRadio = (group, value, label) => {
    const l = document.createElement('label');
    const r = document.createElement('input');
    r.type = 'radio'; r.name = group; r.value = value;
    r.checked = state[group] === value;
    r.addEventListener('change', () => { state[group] = value; onChange(); });
    l.append(r, document.createTextNode(label));
    return l;
  };

  const modeDiv = document.createElement('div');
  modeDiv.style.cssText = 'display: flex; gap: 12px; flex-basis: 100%;';
  modeDiv.append(mkRadio('mode', 'borders', 'Colored borders'), mkRadio('mode', 'numbers', 'Numbers only'));
  root.append(modeDiv);

  const cbLabel = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = state.showCounts;
  cb.addEventListener('change', () => { state.showCounts = cb.checked; onChange(); });
  cbLabel.append(cb, document.createTextNode('Show numeric counts'));
  root.appendChild(cbLabel);
}
export function legendHTML() {
  return `
    <div><b>Borders mode:</b> orange = white controls, blue = black controls. Thicker border = more attackers (capped at 4). Contested squares get a split border — white on top+right, black on bottom+left.</div>
    <div style="margin-top: 8px;"><b>Numbers mode:</b> just the digits, no colors — for when the borders feel busy.</div>
    <div style="margin-top: 8px;">Numeric badges in opposing corners always reflect each side's attacker count.</div>
  `;
}
