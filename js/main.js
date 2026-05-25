// Visual Chess game entry. Uses chess.js for legal moves and game state. Renders the board
// in a persistent SVG and applies overlays on top. Pieces are drag-and-drop.

import { Chess } from '../vendor/chess.js/chess.js';
import { parseFEN } from './chess-utils.js';
import {
  createBoard, renderPieces, squareXY, squareCenter, squareAtPoint,
  SQ, BOARD_SIZE, pieceImageUrl, el,
} from './board.js';
import {
  applyPressure, clearPressure,
  applySight, clearSight,
  applyGuards, clearGuards,
  applyKnightReach, clearKnight,
  drawHints, clearHints,
} from './overlays.js';
import { POSITIONS } from './positions.js';

// === STATE ===================================================================

const chess = new Chess();
const state = {
  overlays: { pressure: false, sight: false, guards: true },
  orientation: 'w',
  dragging: null, // { fromSquare, ghost, originalIdx, color, piece }
  lastFenPins: null, // for VFX
};

// === BOARD ===================================================================

const boardArea = document.getElementById('board-area');
const { svg, layers } = createBoard(state.orientation);
boardArea.appendChild(svg);

// === RENDER ==================================================================

function getBoardArray() {
  return parseFEN(chess.fen()).board;
}

function render() {
  const board = getBoardArray();
  const ctx = { layers, board, orientation: state.orientation };

  // Overlays
  if (state.overlays.pressure) applyPressure(ctx);
  else                         clearPressure(ctx);

  if (state.overlays.sight)    applySight(ctx);
  else                         clearSight(ctx);

  let opacityFor = null;
  if (state.overlays.guards) {
    opacityFor = applyGuards(ctx);
  } else {
    clearGuards(ctx);
  }

  renderPieces(layers.pieces, board, { opacityFor, orientation: state.orientation });

  // Reflect game state into the UI.
  document.getElementById('fen-input').value = chess.fen();
  updateMoveList();
  updateStatus();
}

function updateStatus() {
  const el = document.getElementById('status');
  if (!el) return;
  if (chess.isCheckmate()) {
    el.textContent = `${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate.`;
  } else if (chess.isStalemate()) {
    el.textContent = 'Stalemate.';
  } else if (chess.isDraw()) {
    el.textContent = 'Draw.';
  } else if (chess.isCheck()) {
    el.textContent = `${chess.turn() === 'w' ? 'White' : 'Black'} to move (in check).`;
  } else {
    el.textContent = `${chess.turn() === 'w' ? 'White' : 'Black'} to move.`;
  }
}

function updateMoveList() {
  const list = document.getElementById('move-list');
  if (!list) return;
  const history = chess.history();
  const items = [];
  for (let i = 0; i < history.length; i += 2) {
    const num = i / 2 + 1;
    const wmove = history[i] || '';
    const bmove = history[i + 1] || '';
    items.push(`<div><span class="move-num">${num}.</span> ${wmove} ${bmove}</div>`);
  }
  list.innerHTML = items.join('');
  list.scrollTop = list.scrollHeight;
}

// === DRAG AND DROP ===========================================================

function svgPoint(evt) {
  const rect = svg.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (BOARD_SIZE / rect.width);
  const y = (evt.clientY - rect.top) * (BOARD_SIZE / rect.height);
  return { x, y };
}

function onPointerDown(evt) {
  const pt = svgPoint(evt);
  const sqIdx = squareAtPoint(pt.x, pt.y, state.orientation);
  if (sqIdx < 0) return;
  const board = getBoardArray();
  const piece = board[sqIdx];
  if (!piece) return;
  if (piece.color !== chess.turn()) return; // only the side to move

  // Hide the static piece and create a ghost we drag with the pointer.
  const pieceGroup = layers.pieces.querySelector(`g[data-idx="${sqIdx}"]`);
  if (pieceGroup) pieceGroup.setAttribute('visibility', 'hidden');

  const ghost = el('image', {
    x: pt.x - SQ / 2, y: pt.y - SQ / 2, width: SQ, height: SQ,
    href: pieceImageUrl(piece.color, piece.piece),
    preserveAspectRatio: 'xMidYMid meet',
    'pointer-events': 'none',
  });
  layers.drag.appendChild(ghost);

  // Legal move hints
  const fromSq = idxToSq(sqIdx);
  const moves = chess.moves({ square: fromSq, verbose: true });
  drawHints({ layers, orientation: state.orientation }, fromSq, moves);

  // Knight reach overlay always on while dragging a knight.
  if (piece.piece === 'N') {
    applyKnightReach({ layers, orientation: state.orientation }, sqIdx, piece.color);
  }

  state.dragging = {
    fromSq,
    fromIdx: sqIdx,
    ghost,
    color: piece.color,
    piece: piece.piece,
    moves,
    pieceGroup,
  };

  svg.setPointerCapture(evt.pointerId);
  evt.preventDefault();
}

function onPointerMove(evt) {
  if (!state.dragging) return;
  const pt = svgPoint(evt);
  state.dragging.ghost.setAttribute('x', pt.x - SQ / 2);
  state.dragging.ghost.setAttribute('y', pt.y - SQ / 2);

  // Update knight reach to follow the cursor if dragging a knight.
  if (state.dragging.piece === 'N') {
    const overIdx = squareAtPoint(pt.x, pt.y, state.orientation);
    if (overIdx >= 0) {
      applyKnightReach({ layers, orientation: state.orientation }, overIdx, state.dragging.color);
    }
  }
}

function onPointerUp(evt) {
  if (!state.dragging) return;
  const pt = svgPoint(evt);
  const toIdx = squareAtPoint(pt.x, pt.y, state.orientation);
  const fromSq = state.dragging.fromSq;
  const toSq = toIdx >= 0 ? idxToSq(toIdx) : null;

  // Restore the source piece visibility and remove the ghost.
  if (state.dragging.pieceGroup) state.dragging.pieceGroup.removeAttribute('visibility');
  state.dragging.ghost.remove();
  clearHints({ layers });
  clearKnight({ layers });

  // Try the move.
  if (toSq && toSq !== fromSq) {
    // Detect promotion: a pawn reaching last rank.
    const promotionRank = state.dragging.color === 'w' ? '8' : '1';
    const isPromo = state.dragging.piece === 'P' && toSq.endsWith(promotionRank);
    try {
      const move = chess.move({ from: fromSq, to: toSq, promotion: isPromo ? 'q' : undefined });
      if (move) {
        playSound('move');
      }
    } catch (e) {
      // Illegal; ignore. chess.js throws.
    }
  }

  state.dragging = null;
  render();
  svg.releasePointerCapture(evt.pointerId);
}

function idxToSq(idx) {
  const f = idx % 8;
  const r = 7 - Math.floor(idx / 8);
  return 'abcdefgh'[f] + (r + 1);
}

svg.addEventListener('pointerdown', onPointerDown);
svg.addEventListener('pointermove', onPointerMove);
svg.addEventListener('pointerup', onPointerUp);
svg.addEventListener('pointercancel', onPointerUp);

// === SOUND ===================================================================

// Lightweight chime via Web Audio. Used for "move" (soft click) and "ice" (crystalline ting).
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playSound(kind) {
  try {
    const ctx = getAudioCtx();
    const t0 = ctx.currentTime;
    if (kind === 'move') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t0);
      o.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.15);
    } else if (kind === 'ice') {
      // Two stacked tones for a "freeze" sparkle.
      [1200, 1800, 2600].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const start = t0 + i * 0.05;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.06, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
        o.connect(g).connect(ctx.destination);
        o.start(start); o.stop(start + 0.6);
      });
    }
  } catch (e) { /* audio not available, skip */ }
}

// === PIN VFX =================================================================

// On each render, detect newly-formed pins and trigger sound. The ice scale-in animation
// already happens in overlays.js whenever the ice is (re)drawn.
let prevPinSet = new Set();
function detectNewPins(board) {
  const newSet = new Set();
  // Use chess-utils computePins via parseFEN-derived board; for sound we just need set membership.
  // We rely on the overlay layer's appearance: scan layers.ice for current pinned squares.
  for (const child of layers.ice.children) {
    if (child.dataset && child.dataset.iceSquare) {
      newSet.add(+child.dataset.iceSquare);
    }
  }
  for (const sq of newSet) {
    if (!prevPinSet.has(sq)) {
      playSound('ice');
      break; // one chime is enough even for multiple new pins
    }
  }
  prevPinSet = newSet;
}

// Wrap render to also run the pin detection.
const _renderInner = render;
function renderWithVfx() {
  _renderInner();
  detectNewPins();
}
// Replace the bare references with the VFX-aware version.

// === UI WIRING ===============================================================

// Overlay toggles
for (const key of ['pressure', 'sight', 'guards']) {
  const btn = document.querySelector(`button[data-overlay="${key}"]`);
  if (!btn) continue;
  btn.classList.toggle('active', state.overlays[key]);
  btn.addEventListener('click', () => {
    state.overlays[key] = !state.overlays[key];
    btn.classList.toggle('active', state.overlays[key]);
    renderWithVfx();
  });
}

// New game / undo / flip
document.getElementById('new-game').addEventListener('click', () => {
  chess.reset();
  prevPinSet = new Set();
  renderWithVfx();
});
document.getElementById('undo').addEventListener('click', () => {
  chess.undo();
  renderWithVfx();
});
document.getElementById('flip').addEventListener('click', () => {
  state.orientation = state.orientation === 'w' ? 'b' : 'w';
  const newBoard = createBoard(state.orientation);
  // Replace the SVG entirely (orientation affects everything).
  boardArea.replaceChildren(newBoard.svg);
  // Re-bind events.
  Object.assign(layers, newBoard.layers);
  // Note: this resets the SVG so we re-attach listeners.
  newBoard.svg.addEventListener('pointerdown', onPointerDown);
  newBoard.svg.addEventListener('pointermove', onPointerMove);
  newBoard.svg.addEventListener('pointerup', onPointerUp);
  newBoard.svg.addEventListener('pointercancel', onPointerUp);
  // Rewire `svg` reference for drag math.
  // (We use a closure variable here. For simplicity, we just reload.)
  location.hash = `#flip=${state.orientation}`;
  location.reload();
});

// Position picker
const posList = document.getElementById('position-list');
posList.replaceChildren();
for (const p of POSITIONS) {
  const btn = document.createElement('button');
  btn.dataset.fen = p.fen;
  btn.innerHTML = `<div>${p.name}</div><div class="pos-notes">${p.notes}</div>`;
  btn.addEventListener('click', () => {
    try {
      chess.load(p.fen);
      prevPinSet = new Set();
      renderWithVfx();
    } catch (e) {
      console.warn('Bad FEN for position', p.name, e);
    }
  });
  posList.appendChild(btn);
}

// FEN input
const fenInput = document.getElementById('fen-input');
fenInput.addEventListener('change', () => {
  try {
    chess.load(fenInput.value.trim());
    prevPinSet = new Set();
    renderWithVfx();
  } catch (e) {
    fenInput.style.outline = '2px solid #ff6b6b';
    setTimeout(() => { fenInput.style.outline = ''; }, 600);
  }
});

// === START ===================================================================

// Default to Italian middlegame so the demo has some interesting overlays right away.
try { chess.load(POSITIONS[1].fen); } catch (e) { /* fall back to start */ }
renderWithVfx();
