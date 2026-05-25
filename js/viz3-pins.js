// Visualization 3: pins + protection state.
// Pinned pieces get an ice overlay (more ice = harder pin).
// Protected pieces get a solid, glowing border. Unprotected pieces become semi-transparent with a dotted outline.

import { parseFEN, computePins, computeDefendedMap, computeControl } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el, group } from './board.js';

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const pins = computePins(board);
  const { defenders } = computeDefendedMap(board);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  // Draw protection halos *behind* the pieces (in the control layer slot).
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.piece === 'K') continue;
    const friendly = defenders[i].length;
    const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
    const isHanging = enemy > 0 && friendly === 0;

    const { x, y } = squareXY(i);
    if (friendly > 0 && !isHanging) {
      // Glowing solid ring — "well defended"
      const ring = el('rect', {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#7ee787', 'stroke-width': Math.min(4 + friendly, 8),
        opacity: 0.7,
      });
      layers.control.appendChild(ring);
    } else if (isHanging) {
      // Red dashed ring — "hanging"
      const ring = el('rect', {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#ff6b6b', 'stroke-width': 3, 'stroke-dasharray': '5 4', opacity: 0.85,
      });
      layers.control.appendChild(ring);
    }
  }

  // Pieces — ghost unprotected pieces.
  renderPieces(layers.pieces, board, {
    opacityFor: (i, p) => {
      if (p.piece === 'K') return 1;
      const friendly = defenders[i].length;
      const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
      if (enemy > 0 && friendly === 0) return 0.5; // hanging
      return 1;
    },
  });

  // Ice overlays on pinned pieces (drawn over pieces — layer order puts pins on top).
  for (let i = 0; i < 64; i++) {
    const pin = pins[i];
    if (!pin) continue;
    drawIce(layers.pins, i, pin);
    if (controls.showPinLine) drawPinLine(layers.pins, pin);
  }
}

function drawIce(layer, idx, pin) {
  const { x, y } = squareXY(idx);
  const isAbsolute = pin.severity === 'absolute';

  // Use PNG sprite if present (probed lazily), else fall back to drawn shapes.
  const spriteName = isAbsolute ? 'ice_full' : 'ice_half';
  const g = group();

  // Ice sits over the piece — covering ~all of the square for absolute, ~lower half for relative.
  const cover = isAbsolute ? 0.92 : 0.55;
  const iceH = SQ * cover;
  const iceY = y + SQ - iceH - 2;
  const img = el('image', {
    x: x + 2, y: iceY, width: SQ - 4, height: iceH,
    href: `sprites/${spriteName}.png`,
    preserveAspectRatio: 'xMidYMid slice',
    opacity: 0.85,
  });
  g.appendChild(img);

  // Severity badge in the corner
  const label = isAbsolute ? 'PIN' : 'pin';
  const t = el('text', {
    x: x + SQ / 2, y: y + SQ - 6,
    'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700,
    fill: '#0a3852', stroke: 'rgba(255,255,255,0.95)', 'stroke-width': 2.5, 'paint-order': 'stroke',
    'font-family': 'sans-serif',
  });
  t.textContent = label;
  g.appendChild(t);

  layer.appendChild(g);
}

function drawPinLine(layer, pin) {
  const fromXY = squareXY(pin.pinnedBy);
  const toXY = squareXY(pin.pinnedTo);
  const x1 = fromXY.x + SQ / 2, y1 = fromXY.y + SQ / 2;
  const x2 = toXY.x + SQ / 2, y2 = toXY.y + SQ / 2;
  const ln = el('line', {
    x1, y1, x2, y2,
    stroke: pin.severity === 'absolute' ? '#ff3a3a' : '#ffaa3a',
    'stroke-width': 2, 'stroke-dasharray': '4 4', opacity: 0.6,
  });
  layer.appendChild(ln);
}

export const DEFAULTS = { showPinLine: true };
export const NAME = 'Pins & protection';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';
  const label = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = state.showPinLine;
  cb.addEventListener('change', () => { state.showPinLine = cb.checked; onChange(); });
  label.append(cb, document.createTextNode('Show pin line (attacker → behind piece)'));
  root.appendChild(label);
}
export function legendHTML() {
  return `
    <div><span class="swatch" style="background: rgba(140,220,255,0.55); border: 1px solid #cdf"></span> Ice — pinned piece. Taller ice = absolute pin (against king).</div>
    <div><span class="swatch" style="background: rgba(126,231,135,0.4); border: 2px solid #7ee787"></span> Green ring — piece is defended (thicker ring = more defenders).</div>
    <div><span class="swatch" style="border: 2px dashed #ff6b6b; background: transparent;"></span> Red dashed ring — hanging (attacked &amp; undefended). Glyph also fades.</div>
  `;
}
