// Visualization 3: pins + protection state.
//   - Pinned pieces get an ice overlay. Ice height/intensity scales with the *value differential*
//     between the pinned piece and the piece behind. A pawn pinned against a knight gets a small
//     sliver; a knight pinned against the king gets the heaviest block (but never so opaque that
//     the piece itself disappears).
//   - The pin line is dotted and colored by the *attacker's* side (orange = white attacker pinning
//     a black piece; blue = black attacker pinning a white piece). Pins are directional.
//   - Defended pieces get a green inset border (thicker = more defenders).
//   - Hanging pieces (attacked & undefended) get a red dashed border and the glyph fades.
//   - King is excluded from defender / hanging logic.

import { parseFEN, computePins, computeDefendedMap, computeControl, pieceValue } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareXY, SQ, el, group } from './board.js';

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const pins = computePins(board);
  const { defenders } = computeDefendedMap(board);
  const ctrl = computeControl(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  // Protection rings — drawn under the pieces.
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.piece === 'K') continue;
    const friendly = defenders[i].length;
    const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
    const isHanging = enemy > 0 && friendly === 0;

    const { x, y } = squareXY(i);
    if (friendly > 0 && !isHanging) {
      const ring = el('rect', {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#7ee787', 'stroke-width': Math.min(3 + friendly, 8),
        opacity: 0.75,
      });
      layers.control.appendChild(ring);
    } else if (isHanging) {
      const ring = el('rect', {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#ff6b6b', 'stroke-width': 3, 'stroke-dasharray': '5 4', opacity: 0.9,
      });
      layers.control.appendChild(ring);
    }
  }

  renderPieces(layers.pieces, board, {
    opacityFor: (i, p) => {
      if (p.piece === 'K') return 1;
      const friendly = defenders[i].length;
      const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
      if (enemy > 0 && friendly === 0) return 0.5;
      return 1;
    },
  });

  // Ice overlays on pinned pieces.
  for (let i = 0; i < 64; i++) {
    const pin = pins[i];
    if (!pin) continue;
    drawIce(layers.pins, i, pin, board);
    if (controls.showPinLine) drawPinLine(layers.pins, pin, board);
  }
}

// Returns ice cover fraction (0..1) based on how much is at stake behind the pinned piece.
function iceCoverage(pin, board) {
  const pinned = board[pin.pinnedTo == null ? 0 : 0]; // unused; we have pin.behindPiece
  const behindVal = pieceValue(pin.behindPiece);
  const pinnedVal = pieceValue(board[pin.pinLine[pin.pinLine.length - 1] - 999]?.piece || 'P'); // safe default
  // The pinned piece is the one ICE goes on — find it from pinLine: it's the second-to-last
  // entry's piece. Simpler: read it from the global call site.
  // (We instead pass cover from drawIce directly to avoid this gymnastics.)
  return 0.45;
}

function drawIce(layer, idx, pin, board) {
  const { x, y } = squareXY(idx);
  const isAbsolute = pin.severity === 'absolute';

  const pinned = board[idx];
  const behindVal = pieceValue(pin.behindPiece);
  const pinnedVal = pieceValue(pinned.piece);
  const diff = behindVal - pinnedVal;

  // Ice cover — capped so the piece remains visible.
  // diff 1 → 0.22, 2 → 0.32, 4 → 0.44, 6+ → 0.52. Absolute (behind=K) → 0.55.
  let cover;
  if (isAbsolute) cover = 0.55;
  else if (diff <= 1) cover = 0.22;
  else if (diff === 2) cover = 0.32;
  else if (diff <= 4) cover = 0.44;
  else cover = 0.52;

  const opacity = isAbsolute ? 0.55 : 0.62;
  const spriteName = (isAbsolute || diff >= 4) ? 'ice_full' : 'ice_half';

  const iceH = SQ * cover;
  const iceY = y + SQ - iceH - 2;
  const img = el('image', {
    x: x + 2, y: iceY, width: SQ - 4, height: iceH,
    href: `sprites/${spriteName}.png`,
    preserveAspectRatio: 'xMidYMid slice',
    opacity,
  });
  layer.appendChild(img);

  // Severity badge — small label below the ice.
  const label = isAbsolute ? 'PIN' : 'pin';
  const t = el('text', {
    x: x + SQ / 2, y: y + SQ - 4,
    'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
    fill: '#0a3852', stroke: 'rgba(255,255,255,0.95)', 'stroke-width': 2.5, 'paint-order': 'stroke',
    'font-family': 'sans-serif',
  });
  t.textContent = label;
  layer.appendChild(t);
}

function drawPinLine(layer, pin, board) {
  // Color by the *attacker's* side — pins are directional.
  const attacker = board[pin.pinnedBy];
  const color = attacker.color === 'w' ? '#ff8a52' : '#52a0ff';

  const fromXY = squareXY(pin.pinnedBy);
  const toXY = squareXY(pin.pinnedTo);
  const x1 = fromXY.x + SQ / 2, y1 = fromXY.y + SQ / 2;
  const x2 = toXY.x + SQ / 2, y2 = toXY.y + SQ / 2;
  // Arrow pointing from attacker through to the "behind" piece — that's the direction of threat.
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const shorten = SQ * 0.30;
  const sx = x2 - ux * shorten;
  const sy = y2 - uy * shorten;

  const ln = el('line', {
    x1, y1, x2: sx, y2: sy,
    stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '5 4', opacity: 0.75,
    'stroke-linecap': 'round',
  });
  layer.appendChild(ln);

  // small arrowhead at the "behind" piece end
  const ah = SQ * 0.13;
  const px = -uy, py = ux;
  const head = el('polygon', {
    points: `${sx + ux * ah * 0.7},${sy + uy * ah * 0.7} ${sx + px * ah * 0.5},${sy + py * ah * 0.5} ${sx - px * ah * 0.5},${sy - py * ah * 0.5}`,
    fill: color, opacity: 0.85,
  });
  layer.appendChild(head);
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
    <div><span class="swatch" style="background: rgba(140,220,255,0.6); border: 1px solid #cdf"></span> Ice — pinned piece. Height grows with how much is at stake behind it (light sliver = pawn pinned against a knight; tall block = piece pinned against the king).</div>
    <div style="margin-top: 6px;"><span class="swatch" style="background: rgba(126,231,135,0.4); border: 2px solid #7ee787"></span> Green ring — piece is defended (thicker = more defenders).</div>
    <div style="margin-top: 6px;"><span class="swatch" style="background: transparent; border: 2px dashed #ff6b6b"></span> Red dashed ring — hanging (attacked &amp; undefended). Glyph also fades.</div>
    <div style="margin-top: 6px;">Pin line is dashed in the attacker's color — orange if a white piece is doing the pinning, blue if it's a black piece.</div>
  `;
}
