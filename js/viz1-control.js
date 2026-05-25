// Visualization 1: controlled space, full-square proportional fill.
//
// Uncontested squares keep their board colour. Squares attacked by only one side are entirely
// recoloured in that side's tint. Contested squares are split horizontally in proportion to the
// attacker ratio, white half at the bottom (white's side of the board), black half at the top.
//
// Goal: see space dominance and pressure from across the room.

import { parseFEN, computeControl } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, BOARD_SIZE, LIGHT, el } from './board.js';

// Softer than the previous hot pink/navy. Warm peach for white, mid blue for black,
// both at low saturation so the pieces on top stay readable.
const WHITE_RGB = [240, 152, 96];  // #f09860 warm peach
const BLACK_RGB = [88, 134, 215];  // #5886d7 mid blue
const FILL_ALPHA = 0.82;

function rgb([r, g, b], a = 1) { return `rgba(${r}, ${g}, ${b}, ${a})`; }

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  // Single light background instead of the brown/cream pattern, so the overlay colours
  // don't have to fight the board palette.
  layers.squares.replaceChildren(el('rect', {
    x: 0, y: 0, width: BOARD_SIZE, height: BOARD_SIZE, fill: LIGHT,
  }));

  drawProportionalFills(layers.control, ctrl);
  if (controls.showCounts) drawCounts(layers.control, ctrl);

  renderPieces(layers.pieces, board);
}

function drawProportionalFills(layer, ctrl) {
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i);
    const total = wn + bn;
    if (wn > 0) {
      const h = SQ * (wn / total);
      layer.appendChild(el('rect', {
        x, y: y + SQ - h, width: SQ, height: h,
        fill: rgb(WHITE_RGB, FILL_ALPHA),
      }));
    }
    if (bn > 0) {
      const h = SQ * (bn / total);
      layer.appendChild(el('rect', {
        x, y, width: SQ, height: h,
        fill: rgb(BLACK_RGB, FILL_ALPHA),
      }));
    }
  }
}

function drawCounts(layer, ctrl) {
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i);
    if (wn > 0) addCount(layer, x + SQ - 6, y + SQ - 6, wn);
    if (bn > 0) addCount(layer, x + SQ - 6, y + 18, bn);
  }
}

function addCount(layer, x, y, n) {
  const t = el('text', {
    x, y,
    fill: '#fff',
    'font-size': 13, 'font-weight': 600, 'text-anchor': 'end',
    'font-family': 'sans-serif',
  });
  t.textContent = String(n);
  layer.appendChild(t);
}

export const DEFAULTS = { showCounts: true };
export const NAME = 'Pressure';
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
    <div>Each square is filled with the controllers' colours. Uncontested squares keep their original board colour.</div>
    <div style="margin-top: 6px;">Contested squares split horizontally in proportion to the attacker counts. White (peach) at the bottom (white's side), black (blue) at the top. A 3:1 ratio means roughly three-quarters of the square is the dominant side's colour, so pressure and space dominance read at a glance.</div>
    <div style="margin-top: 6px;">Numbers in the right margins are the raw counts per side; turn them off if you only want the painted ratio.</div>
  `;
}
