// Overlays. Each function takes a `ctx` with { layers, board, orientation } and
// updates exactly one layer. The main page composes these on a shared persistent SVG.
//
// ctx = {
//   board: 64-array from parseFEN(fen).board
//   orientation: 'w' or 'b'
//   layers: { pressure, sight, guards, knight, ice, ... }
// }

import {
  parseFEN, computeControl, computeDefendedMap, computePins, pieceValue,
  pieceAttackVectors, fileOf, rankOf,
} from './chess-utils.js';
import {
  paintBoardSolid, drawBoardSquares,
  squareXY, squareCenter, SQ, BOARD_SIZE, LIGHT, el, group, text,
} from './board.js';

const PINK = [219, 39, 119];                            // legacy
const NAVY = [30, 58, 138];                             // legacy
const WHITE_FILL = [240, 152, 96];                      // peach
const BLACK_FILL = [88, 134, 215];                      // mid blue
const COLOR_W = '#db2777';                              // hot pink
const COLOR_B = '#1e3a8a';                              // navy
function rgb([r, g, b], a = 1) { return `rgba(${r}, ${g}, ${b}, ${a})`; }

// === PRESSURE ================================================================

export function clearPressure({ layers }) {
  layers.pressure.replaceChildren();
}

export function applyPressure({ layers, board, orientation }, { showCounts = true } = {}) {
  layers.pressure.replaceChildren();
  const ctrl = computeControl(board);

  // Proportional vertical fills, white at bottom, black at top.
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i, orientation);
    const total = wn + bn;
    if (wn > 0) {
      const h = SQ * (wn / total);
      layers.pressure.appendChild(el('rect', {
        x, y: y + SQ - h, width: SQ, height: h,
        fill: rgb(WHITE_FILL, 0.82),
      }));
    }
    if (bn > 0) {
      const h = SQ * (bn / total);
      layers.pressure.appendChild(el('rect', {
        x, y, width: SQ, height: h,
        fill: rgb(BLACK_FILL, 0.82),
      }));
    }
  }

  // Thin grid on top so squares stay readable.
  for (let i = 1; i < 8; i++) {
    const v = i * SQ;
    layers.pressure.appendChild(el('line', {
      x1: v, y1: 0, x2: v, y2: 8 * SQ,
      stroke: 'rgba(60, 40, 25, 0.32)', 'stroke-width': 1,
    }));
    layers.pressure.appendChild(el('line', {
      x1: 0, y1: v, x2: 8 * SQ, y2: v,
      stroke: 'rgba(60, 40, 25, 0.32)', 'stroke-width': 1,
    }));
  }

  if (showCounts) drawPressureCounts(layers.pressure, ctrl, orientation);
}

function drawPressureCounts(layer, ctrl, orientation) {
  for (let i = 0; i < 64; i++) {
    const wn = ctrl[i].w.length;
    const bn = ctrl[i].b.length;
    if (wn === 0 && bn === 0) continue;
    const { x, y } = squareXY(i, orientation);
    if (wn > 0) {
      const t = el('text', {
        x: x + SQ - 6, y: y + SQ - 6,
        fill: '#fff',
        'font-size': 13, 'font-weight': 600, 'text-anchor': 'end',
        'font-family': 'sans-serif',
      });
      t.textContent = String(wn);
      layer.appendChild(t);
    }
    if (bn > 0) {
      const t = el('text', {
        x: x + SQ - 6, y: y + 18,
        fill: '#fff',
        'font-size': 13, 'font-weight': 600, 'text-anchor': 'end',
        'font-family': 'sans-serif',
      });
      t.textContent = String(bn);
      layer.appendChild(t);
    }
  }
}

// === SIGHT ===================================================================

const SIGHT_WIDTH = 3.5;

export function clearSight({ layers }) { layers.sight.replaceChildren(); }

export function applySight({ layers, board, orientation }, { sideFilter = 'both', pieceFilter = 'all' } = {}) {
  layers.sight.replaceChildren();
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    if (sideFilter !== 'both' && sideFilter !== p.color) continue;
    if (pieceFilter !== 'all' && pieceFilter !== p.piece) continue;

    const color = p.color === 'w' ? COLOR_W : COLOR_B;
    switch (p.piece) {
      case 'P': drawSightPawn(layers.sight, board, i, color, orientation); break;
      case 'N': break; // intentionally not drawn
      case 'K': drawSightKing(layers.sight, board, i, color, orientation); break;
      case 'B': case 'R': case 'Q':
        drawSightSlider(layers.sight, board, i, color, orientation); break;
    }
  }
}

function drawSightPawn(layer, board, from, color, orientation) {
  const p = board[from];
  const f = fileOf(from), r = rankOf(from);
  const dir = p.color === 'w' ? +1 : -1;
  const center = squareCenter(from, orientation);
  for (const df of [-1, +1]) {
    const nf = f + df, nr = r + dir;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const targetIdx = nf + (7 - nr) * 8;
    const target = squareCenter(targetIdx, orientation);
    const fraction = 0.55;
    const ex = center.x + (target.x - center.x) * fraction;
    const ey = center.y + (target.y - center.y) * fraction;
    layer.appendChild(el('line', {
      x1: center.x, y1: center.y, x2: ex, y2: ey,
      stroke: color, 'stroke-width': 12, opacity: 0.92, 'stroke-linecap': 'round',
    }));
  }
}

function drawSightKing(layer, board, from, color, orientation) {
  const center = squareCenter(from, orientation);
  const innerR = SQ * 0.30;
  const outerR = SQ * 0.48;
  const vectors = pieceAttackVectors(board, from);
  for (const v of vectors) {
    if (v.type !== 'king') continue;
    const target = squareCenter(v.to, orientation);
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    layer.appendChild(el('line', {
      x1: center.x + ux * innerR, y1: center.y + uy * innerR,
      x2: center.x + ux * outerR, y2: center.y + uy * outerR,
      stroke: color, 'stroke-width': 3, opacity: 0.85, 'stroke-linecap': 'round',
    }));
  }
}

function drawSightSlider(layer, board, from, color, orientation) {
  const center = squareCenter(from, orientation);
  const vectors = pieceAttackVectors(board, from);
  for (const v of vectors) {
    if (v.type !== 'ray') continue;
    const rayCenters = v.ray.map(idx => squareCenter(idx, orientation));
    const blockerIdx = v.blockedBy != null ? v.ray.indexOf(v.blockedBy) : v.ray.length - 1;
    const solidEnd = rayCenters[blockerIdx];
    layer.appendChild(el('line', {
      x1: center.x, y1: center.y, x2: solidEnd.x, y2: solidEnd.y,
      stroke: color, 'stroke-width': 3, opacity: 0.9, 'stroke-linecap': 'round',
    }));
    if (v.blockedBy != null) {
      const [df, dr] = v.dir;
      let f = fileOf(v.blockedBy), r = rankOf(v.blockedBy);
      let prev = solidEnd;
      while (true) {
        f += df; r += dr;
        if (f < 0 || f > 7 || r < 0 || r > 7) break;
        const next = squareCenter(f + (7 - r) * 8, orientation);
        layer.appendChild(el('line', {
          x1: prev.x, y1: prev.y, x2: next.x, y2: next.y,
          stroke: color, 'stroke-width': 2.5, opacity: 0.55,
          'stroke-dasharray': '4 5', 'stroke-linecap': 'round',
        }));
        prev = next;
      }
    }
  }
}

// === GUARDS (rings + ice + opacity) ==========================================

export function clearGuards({ layers }) {
  layers.guards.replaceChildren();
  layers.ice.replaceChildren();
}

// Returns the per-piece opacity map so the caller can apply it to the pieces layer.
export function applyGuards({ layers, board }, { showPinLine = true } = {}) {
  layers.guards.replaceChildren();
  layers.ice.replaceChildren();

  const pins = computePins(board);
  const { defenders: rawDefenders } = computeDefendedMap(board);
  const ctrl = computeControl(board);

  // Filter pinned defenders that can't actually defend the target (target off pin line).
  const effectiveDefenders = rawDefenders.map((list, sq) =>
    list.filter(defIdx => {
      const pin = pins[defIdx];
      if (!pin) return true;
      return pin.pinLine.includes(sq);
    })
  );

  // Rings.
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.piece === 'K') continue;
    const friendly = effectiveDefenders[i];
    const friendlyCount = friendly.length;
    const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
    const isHanging = enemy > 0 && friendlyCount === 0;
    const hasPawnAnchor = friendly.some(j => board[j].piece === 'P');

    const { x, y } = squareXY(i);
    if (friendlyCount > 0 && !isHanging) {
      const attrs = {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#7ee787', 'stroke-width': Math.min(3 + friendlyCount, 8),
        opacity: 0.75,
      };
      if (!hasPawnAnchor) attrs['stroke-dasharray'] = '4 4';
      layers.guards.appendChild(el('rect', attrs));
    } else if (isHanging) {
      layers.guards.appendChild(el('rect', {
        x: x + 4, y: y + 4, width: SQ - 8, height: SQ - 8,
        fill: 'none', rx: 8, ry: 8,
        stroke: '#ff6b6b', 'stroke-width': 3, 'stroke-dasharray': '5 4', opacity: 0.9,
      }));
    }
  }

  // Ice on pins (animated on the ice layer).
  for (let i = 0; i < 64; i++) {
    const pin = pins[i];
    if (!pin) continue;
    drawIce(layers.ice, i, pin, board);
    if (showPinLine) drawPinLine(layers.ice, pin, board);
  }

  // Return the opacity-for function for the pieces layer.
  return (i, p) => {
    if (p.piece === 'K') return 1;
    const friendly = effectiveDefenders[i].length;
    const enemy = ctrl[i][p.color === 'w' ? 'b' : 'w'].length;
    if (enemy > 0 && friendly === 0) return 0.45;
    if (friendly === 0) return 0.72;
    return 1;
  };
}

function drawIce(layer, idx, pin, board) {
  const { x, y } = squareXY(idx);
  const isBigStake = pin.behindPiece === 'K' || pin.behindPiece === 'Q';
  const spriteName = isBigStake ? 'ice_full' : 'ice_half';
  const iceW = SQ * (isBigStake ? 0.96 : 0.78);
  const iceH = iceW * (1024 / 1536);
  const iceX = x + (SQ - iceW) / 2;
  const iceY = y + SQ - iceH - 1;

  const img = el('image', {
    x: iceX, y: iceY, width: iceW, height: iceH,
    href: `sprites/${spriteName}.png`,
    preserveAspectRatio: 'xMidYMid meet',
    opacity: 0,
  });
  // Animate in (VFX): fade + slight pop.
  img.dataset.iceSquare = idx;
  layer.appendChild(img);

  // Trigger animation on next frame.
  requestAnimationFrame(() => {
    img.style.transition = 'opacity 280ms ease-out, transform 320ms cubic-bezier(.2,.9,.3,1.2)';
    img.style.transformOrigin = `${iceX + iceW / 2}px ${iceY + iceH}px`;
    img.style.transform = 'scale(0.6)';
    img.setAttribute('opacity', '0.95');
    requestAnimationFrame(() => {
      img.style.transform = 'scale(1)';
    });
  });
}

function drawPinLine(layer, pin, board) {
  const attacker = board[pin.pinnedBy];
  const color = attacker.color === 'w' ? COLOR_W : COLOR_B;
  const fromXY = squareXY(pin.pinnedBy);
  const toXY = squareXY(pin.pinnedTo);
  const x1 = fromXY.x + SQ / 2, y1 = fromXY.y + SQ / 2;
  const x2 = toXY.x + SQ / 2, y2 = toXY.y + SQ / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const shorten = SQ * 0.30;
  const sx = x2 - ux * shorten;
  const sy = y2 - uy * shorten;
  layer.appendChild(el('line', {
    x1, y1, x2: sx, y2: sy,
    stroke: color, 'stroke-width': 2.5, 'stroke-dasharray': '5 4', opacity: 0.75,
    'stroke-linecap': 'round',
  }));
  const ah = SQ * 0.13;
  const px = -uy, py = ux;
  layer.appendChild(el('polygon', {
    points: `${sx + ux * ah * 0.7},${sy + uy * ah * 0.7} ${sx + px * ah * 0.5},${sy + py * ah * 0.5} ${sx - px * ah * 0.5},${sy - py * ah * 0.5}`,
    fill: color, opacity: 0.85,
  }));
}

// === KNIGHT REACH ============================================================

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

export function clearKnight({ layers }) { layers.knight.replaceChildren(); }

// Draw knight L-pattern around the given square. Used during drag to train the eye.
// color: 'w' / 'b' decides tint.
export function applyKnightReach({ layers, orientation }, fromIdx, color = 'w') {
  layers.knight.replaceChildren();
  const tint = color === 'w' ? COLOR_W : COLOR_B;
  for (const sq of knightSquares(fromIdx)) {
    const { x, y } = squareXY(sq, orientation);
    layers.knight.appendChild(el('rect', {
      x: x + 3, y: y + 3, width: SQ - 6, height: SQ - 6,
      fill: `${tint}`, opacity: 0.18, rx: 6, ry: 6,
    }));
    layers.knight.appendChild(el('rect', {
      x: x + 3, y: y + 3, width: SQ - 6, height: SQ - 6,
      fill: 'none', stroke: tint, 'stroke-width': 2.5,
      opacity: 0.85, 'stroke-dasharray': '4 4', rx: 6, ry: 6,
    }));
  }
}

// === MOVE HINTS (legal-move dots) ===========================================
// Not strictly an overlay; called from main.js when a piece is picked up.

export function clearHints({ layers }) { layers.hints.replaceChildren(); }

export function drawHints({ layers, orientation }, fromSquareName, moves) {
  layers.hints.replaceChildren();
  // Highlight the source square.
  const fromIdx = sqToIdx(fromSquareName);
  if (fromIdx >= 0) {
    const { x, y } = squareXY(fromIdx, orientation);
    layers.hints.appendChild(el('rect', {
      x, y, width: SQ, height: SQ,
      fill: '#fde68a', opacity: 0.55,
    }));
  }
  // Dots on legal targets.
  for (const m of moves) {
    const idx = sqToIdx(m.to);
    const { x, y } = squareXY(idx, orientation);
    const c = { x: x + SQ / 2, y: y + SQ / 2 };
    if (m.captured) {
      layers.hints.appendChild(el('rect', {
        x: x + 3, y: y + 3, width: SQ - 6, height: SQ - 6,
        fill: 'none', stroke: '#dc2626', 'stroke-width': 4, rx: 4, ry: 4,
        opacity: 0.85,
      }));
    } else {
      layers.hints.appendChild(el('circle', {
        cx: c.x, cy: c.y, r: SQ * 0.16,
        fill: 'rgba(60, 40, 25, 0.4)',
      }));
    }
  }
}

function sqToIdx(sq) {
  if (!sq || sq.length !== 2) return -1;
  const f = sq.charCodeAt(0) - 97;
  const r = +sq[1] - 1;
  if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
  return (7 - r) * 8 + f;
}
