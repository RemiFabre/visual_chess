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

    // White always paints only the BOTTOM half border (white's side of the square).
    // Black always paints only the TOP half border (black's side).
    // When both control, the two halves meet at the mid-height of the side edges.
    if (wn > 0) drawBottomHalf(layer, x, y, WHITE_RGB, widthFor(wn));
    if (bn > 0) drawTopHalf(layer, x, y, BLACK_RGB, widthFor(bn));
  }
}

// Draws a U-shape: down the left side from middle to bottom, across the bottom, up the right side
// from bottom to middle. Inset so the stroke stays entirely inside the square.
function drawBottomHalf(layer, x, y, color, width) {
  const inset = width / 2 + 0.5;
  const points =
    `${x + inset},${y + SQ / 2} ` +
    `${x + inset},${y + SQ - inset} ` +
    `${x + SQ - inset},${y + SQ - inset} ` +
    `${x + SQ - inset},${y + SQ / 2}`;
  const p = el('polyline', {
    points, fill: 'none', stroke: rgb(color), 'stroke-width': width,
    'stroke-linejoin': 'miter', 'stroke-linecap': 'butt',
  });
  layer.appendChild(p);
}

// Inverted U: up the left side from middle to top, across the top, down the right side to middle.
function drawTopHalf(layer, x, y, color, width) {
  const inset = width / 2 + 0.5;
  const points =
    `${x + inset},${y + SQ / 2} ` +
    `${x + inset},${y + inset} ` +
    `${x + SQ - inset},${y + inset} ` +
    `${x + SQ - inset},${y + SQ / 2}`;
  const p = el('polyline', {
    points, fill: 'none', stroke: rgb(color), 'stroke-width': width,
    'stroke-linejoin': 'miter', 'stroke-linecap': 'butt',
  });
  layer.appendChild(p);
}

function drawCounts(layer, ctrl) {
  // White's count sits near the bottom of the square (closer to white's side of the board).
  // Black's count sits near the top (closer to black's side).
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i);
    if (wn > 0) addCount(layer, x + 8, y + SQ - 6, wn, WHITE_RGB, 'start'); // bottom-left
    if (bn > 0) addCount(layer, x + SQ - 8, y + 18, bn, BLACK_RGB, 'end'); // top-right
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
    <div><b>Borders mode:</b> each side colors only its own half of the square's border. White paints the bottom half, black the top — when a square is contested the two colors meet face-to-face at the side edges. Thicker border = more attackers (capped at 4).</div>
    <div style="margin-top: 8px;"><b>Numbers mode:</b> just the digits, no colors — for when the borders feel busy.</div>
    <div style="margin-top: 8px;">Numeric badges: white's count sits at the bottom of each square (white's side), black's count at the top.</div>
  `;
}
