// Visualization 4: thought bubbles.
// Each piece carries a small comic bubble showing what it's defending. When a single piece is
// defending multiple valuable things, its bubble grows + gains a "overloaded" sweat-drop indicator.

import { parseFEN, computeDefendedMap, pieceValue } from './chess-utils.js';
import { createBoardSVG, renderPieces, squareCenter, squareXY, SQ, el, group } from './board.js';

// Sprite probing — viz4 needs to know which piece images exist so it can use them
// inside the thought bubbles instead of Unicode glyphs.
let SPRITES_AVAILABLE = new Set();
async function probeBubbleSprites() {
  if (SPRITES_AVAILABLE.size > 0) return;
  const keys = [];
  for (const c of ['w', 'b']) for (const pp of 'KQRBNP') keys.push(`${c}${pp}`);
  await Promise.all(keys.map(async (k) => {
    try {
      const r = await fetch(`sprites/piece_${k}.png`, { method: 'HEAD' });
      if (r.ok) SPRITES_AVAILABLE.add(k);
    } catch (_) {}
  }));
}
probeBubbleSprites();

const GLYPH = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

export function render(container, fen, controls) {
  const { board } = parseFEN(fen);
  const { defending } = computeDefendedMap(board);

  const { svg, layers } = createBoardSVG();
  container.replaceChildren(svg);

  renderPieces(layers.pieces, board);

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    // Exclude king from "defends" — king isn't a real defender target (can't be captured).
    const defends = defending[i].filter(sq => board[sq].piece !== 'K');
    if (defends.length === 0) continue;
    if (controls.sideFilter !== 'both' && controls.sideFilter !== p.color) continue;

    const load = defends.reduce((s, sq) => s + pieceValue(board[sq].piece), 0);
    const overload = defends.length >= 2 && load >= 4;

    if (controls.mode === 'overloaded' && !overload) continue;
    if (controls.mode === 'multi' && defends.length < 2) continue;

    drawBubble(layers.bubbles, i, p, defends.map(sq => board[sq]), { overload, board });
  }
}

function drawBubble(layer, fromIdx, piece, defendedPieces, { overload, board }) {
  const center = squareCenter(fromIdx);
  // Place the bubble above and to the side of the piece — try a few candidate offsets and pick
  // one that doesn't go off-board.
  const offsets = [
    { dx: SQ * 0.55, dy: -SQ * 0.55 },
    { dx: -SQ * 0.55, dy: -SQ * 0.55 },
    { dx: SQ * 0.55, dy: SQ * 0.55 },
    { dx: -SQ * 0.55, dy: SQ * 0.55 },
  ];
  // Bubble grows with defended count.
  const w = 38 + defendedPieces.length * 22;
  const h = 38;
  let bx, by;
  let placed = false;
  for (const o of offsets) {
    bx = center.x + o.dx - w / 2;
    by = center.y + o.dy - h / 2;
    if (bx > 4 && bx + w < 720 - 4 && by > 4 && by + h < 720 - 4) { placed = true; break; }
  }
  if (!placed) {
    // Clamp to board boundaries.
    bx = Math.max(4, Math.min(720 - 4 - w, bx));
    by = Math.max(4, Math.min(720 - 4 - h, by));
  }

  const g = group();

  // Tail (little circles fading from piece to bubble — thought-bubble style)
  const tailSteps = 3;
  for (let s = 1; s <= tailSteps; s++) {
    const t = s / (tailSteps + 1);
    const tx = center.x + (bx + w / 2 - center.x) * t;
    const ty = center.y + (by + h / 2 - center.y) * t;
    const r = 3 + s * 1.5;
    const c = el('circle', { cx: tx, cy: ty, r, fill: 'rgba(255,255,255,0.92)', stroke: '#333', 'stroke-width': 1 });
    g.appendChild(c);
  }

  // Bubble
  const bubble = el('rect', {
    x: bx, y: by, width: w, height: h, rx: h / 2, ry: h / 2,
    fill: overload ? 'rgba(255, 235, 230, 0.96)' : 'rgba(255,255,255,0.95)',
    stroke: overload ? '#d04040' : '#333', 'stroke-width': overload ? 2 : 1.2,
  });
  g.appendChild(bubble);

  // Defended piece glyphs inside the bubble
  for (let k = 0; k < defendedPieces.length; k++) {
    const dp = defendedPieces[k];
    const gx = bx + 14 + k * 22;
    const gy = by + h / 2;
    const key = `${dp.color}${dp.piece}`;
    if (SPRITES_AVAILABLE.has(key)) {
      const size = 28;
      const img = el('image', {
        x: gx - size / 2, y: gy - size / 2, width: size, height: size,
        href: `sprites/piece_${key}.png`,
        preserveAspectRatio: 'xMidYMid meet',
      });
      g.appendChild(img);
    } else {
      const t = el('text', {
        x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 24, fill: dp.color === 'w' ? '#fff' : '#222', stroke: dp.color === 'w' ? '#222' : '#fff',
        'stroke-width': 1.5, 'paint-order': 'stroke',
        'font-family': '"Noto Sans Symbols 2", "DejaVu Sans", "Segoe UI Symbol", sans-serif',
      });
      t.textContent = GLYPH[dp.color][dp.piece];
      g.appendChild(t);
    }
  }

  // Overloaded — drop a stylized sweat drop sprite next to the bubble.
  if (overload) {
    const dropSize = 22;
    const dx = bx + w - dropSize * 0.4;
    const dy = by - dropSize * 0.4;
    const drop = el('image', {
      x: dx, y: dy, width: dropSize, height: dropSize,
      href: 'sprites/sweat_drop.png',
      preserveAspectRatio: 'xMidYMid meet',
    });
    g.appendChild(drop);
  }

  layer.appendChild(g);
}

export const DEFAULTS = { sideFilter: 'both', mode: 'multi' };
export const NAME = 'Thought bubbles';
export function buildControls(root, state, onChange) {
  root.innerHTML = '';

  const sideLabel = document.createElement('label');
  sideLabel.innerHTML = `Side <select><option value="both">both</option><option value="w">white</option><option value="b">black</option></select>`;
  const sideSelect = sideLabel.querySelector('select');
  sideSelect.value = state.sideFilter;
  sideSelect.addEventListener('change', () => { state.sideFilter = sideSelect.value; onChange(); });

  const modeLabel = document.createElement('label');
  modeLabel.innerHTML = `Show <select><option value="all">all defenders</option><option value="multi">2+ defended (clearer)</option><option value="overloaded">overloaded only</option></select>`;
  const modeSelect = modeLabel.querySelector('select');
  modeSelect.value = state.mode;
  modeSelect.addEventListener('change', () => { state.mode = modeSelect.value; onChange(); });

  root.append(sideLabel, modeLabel);
}
export function legendHTML() {
  return `
    <div>Each piece "thinks about" the friendly pieces it defends. Bubbles grow with how much value is at stake.</div>
    <div style="margin-top: 8px;">A bubble outlined in red with a blue sweat drop = the piece is <b>overloaded</b> (high combined value of defended pieces). That piece is a juicy target for tactics.</div>
  `;
}
