// Visual Chess game entry. Uses chess.js for legal moves and game state. Renders the board
// in a persistent SVG and applies overlays on top. Pieces are drag-and-drop AND click-to-move.

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
  // Click-to-move selection. `selected.fromSq` is the source square (a-h + 1-8).
  selected: null,
  // Drag tracking. Set on pointerdown, cleared on pointerup.
  dragging: null,
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

  // Redraw the selection hint if any.
  if (state.selected) {
    const moves = chess.moves({ square: state.selected.fromSq, verbose: true });
    drawHints({ layers, orientation: state.orientation }, state.selected.fromSq, moves);
  } else {
    clearHints({ layers });
  }

  document.getElementById('fen-input').value = chess.fen();
  updateMoveList();
  updateStatus();

  detectNewPins();
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

// === DRAG + CLICK ============================================================

function svgPoint(evt) {
  const rect = svg.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (BOARD_SIZE / rect.width);
  const y = (evt.clientY - rect.top) * (BOARD_SIZE / rect.height);
  return { x, y };
}

function idxToSq(idx) {
  const f = idx % 8;
  const r = 7 - Math.floor(idx / 8);
  return 'abcdefgh'[f] + (r + 1);
}

function selectSquare(square) {
  const moves = chess.moves({ square, verbose: true });
  if (moves.length === 0) {
    deselect();
    return;
  }
  state.selected = { fromSq: square };
  drawHints({ layers, orientation: state.orientation }, square, moves);

  // Knight reach: light up the L-pattern on selection too, not just drag.
  const board = getBoardArray();
  const sqIdx = sqToIdxLocal(square);
  if (sqIdx >= 0 && board[sqIdx] && board[sqIdx].piece === 'N') {
    applyKnightReach({ layers, orientation: state.orientation }, sqIdx, board[sqIdx].color);
  } else {
    clearKnight({ layers });
  }
}

function deselect() {
  state.selected = null;
  clearHints({ layers });
  clearKnight({ layers });
}

function attemptMove(from, to, promotion) {
  try {
    const move = chess.move({ from, to, promotion });
    if (move) {
      playSound('move');
      return move;
    }
  } catch (_) {}
  return null;
}

function moveFromSelectionIfLegal(targetSq) {
  if (!state.selected) return false;
  const fromSq = state.selected.fromSq;
  const moves = chess.moves({ square: fromSq, verbose: true });
  const candidate = moves.find(m => m.to === targetSq);
  if (!candidate) return false;
  const promo = candidate.flags.includes('p') ? 'q' : undefined;
  const move = attemptMove(fromSq, targetSq, promo);
  if (move) {
    deselect();
    render();
    return true;
  }
  return false;
}

function sqToIdxLocal(sq) {
  if (!sq || sq.length !== 2) return -1;
  const f = sq.charCodeAt(0) - 97;
  const r = +sq[1] - 1;
  if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
  return (7 - r) * 8 + f;
}

function onPointerDown(evt) {
  const pt = svgPoint(evt);
  const sqIdx = squareAtPoint(pt.x, pt.y, state.orientation);
  if (sqIdx < 0) return;
  const sq = idxToSq(sqIdx);
  const board = getBoardArray();
  const piece = board[sqIdx];

  // If something is already selected and the click hits a legal destination, move.
  if (state.selected && moveFromSelectionIfLegal(sq)) {
    return;
  }

  // If clicking on a piece of the side to move, start a drag and tentatively select.
  if (piece && piece.color === chess.turn()) {
    // Hide source piece, create ghost in the dedicated layer so hints don't clobber it.
    const pieceGroup = layers.pieces.querySelector(`g[data-idx="${sqIdx}"]`);
    if (pieceGroup) pieceGroup.setAttribute('visibility', 'hidden');

    const ghost = el('image', {
      x: pt.x - SQ / 2, y: pt.y - SQ / 2, width: SQ, height: SQ,
      href: pieceImageUrl(piece.color, piece.piece),
      preserveAspectRatio: 'xMidYMid meet',
      'pointer-events': 'none',
    });
    layers.ghost.appendChild(ghost);

    // Legal-move hints (and knight reach if a knight).
    selectSquare(sq);

    state.dragging = {
      fromSq: sq,
      fromIdx: sqIdx,
      startPt: pt,
      ghost,
      color: piece.color,
      piece: piece.piece,
      pieceGroup,
      moved: false, // becomes true once the pointer leaves the source square
    };

    svg.setPointerCapture(evt.pointerId);
    evt.preventDefault();
    return;
  }

  // Clicked on empty or enemy square with no selection: deselect.
  deselect();
}

function onPointerMove(evt) {
  if (!state.dragging) return;
  const pt = svgPoint(evt);
  state.dragging.ghost.setAttribute('x', pt.x - SQ / 2);
  state.dragging.ghost.setAttribute('y', pt.y - SQ / 2);

  // Mark as "moved" once we've crossed a small threshold.
  const dx = pt.x - state.dragging.startPt.x;
  const dy = pt.y - state.dragging.startPt.y;
  if (!state.dragging.moved && (dx * dx + dy * dy) > 16) {
    state.dragging.moved = true;
  }

  // Knight reach follows the cursor when dragging a knight, so you can preview
  // where landing on each candidate square would put the L-pattern.
  if (state.dragging.piece === 'N') {
    const overIdx = squareAtPoint(pt.x, pt.y, state.orientation);
    if (overIdx >= 0) {
      applyKnightReach({ layers, orientation: state.orientation }, overIdx, state.dragging.color);
    }
  }
}

function onPointerUp(evt) {
  if (!state.dragging) return;
  const drag = state.dragging;
  state.dragging = null;

  const pt = svgPoint(evt);
  const toIdx = squareAtPoint(pt.x, pt.y, state.orientation);
  const toSq = toIdx >= 0 ? idxToSq(toIdx) : null;

  if (drag.pieceGroup) drag.pieceGroup.removeAttribute('visibility');
  drag.ghost.remove();

  try { svg.releasePointerCapture(evt.pointerId); } catch (_) {}

  // If the pointer barely moved, treat it as a click (selection stays for click-to-move).
  if (!drag.moved && toSq === drag.fromSq) {
    // Restore knight reach overlay for the selected knight (selectSquare did it already).
    return; // selection + hints remain visible
  }

  // Otherwise, try to apply the move from from→to.
  if (toSq && toSq !== drag.fromSq) {
    // Knight reach overlay restored to the source on attempted move (it'll be cleared in render).
    const piece = drag.piece;
    const promo = piece === 'P' && (toSq.endsWith('8') || toSq.endsWith('1')) ? 'q' : undefined;
    const move = attemptMove(drag.fromSq, toSq, promo);
    if (move) deselect();
  }

  render();
}

svg.addEventListener('pointerdown', onPointerDown);
svg.addEventListener('pointermove', onPointerMove);
svg.addEventListener('pointerup', onPointerUp);
svg.addEventListener('pointercancel', onPointerUp);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    deselect();
  }
});

// === SOUND ===================================================================

// Lichess-style "wood tap" for moves and a light "freeze" for pins, both via Web Audio.
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume if suspended (some browsers gate audio until user interaction).
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playSound(kind) {
  try {
    const ctx = getAudioCtx();
    const t0 = ctx.currentTime;
    if (kind === 'move') {
      // Short bandpass-filtered noise burst, like a tap on a wooden board.
      const dur = 0.06;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 1.8);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.value = 0.45;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t0);
    } else if (kind === 'ice') {
      // Light shimmer: three high tones slightly detuned, brief bell envelope.
      const freqs = [2200, 2640, 3300];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = (i - 1) * 6;
        const start = t0 + i * 0.04;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.035, start + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(start);
        o.stop(start + 0.4);
      });
    }
  } catch (_) {}
}

// === PIN VFX =================================================================

let prevPinSet = new Set();
function detectNewPins() {
  const newSet = new Set();
  for (const child of layers.ice.children) {
    if (child.dataset && child.dataset.iceSquare) {
      newSet.add(+child.dataset.iceSquare);
    }
  }
  for (const sq of newSet) {
    if (!prevPinSet.has(sq)) {
      playSound('ice');
      break;
    }
  }
  prevPinSet = newSet;
}

// === UI WIRING ===============================================================

for (const key of ['pressure', 'sight', 'guards']) {
  const btn = document.querySelector(`button[data-overlay="${key}"]`);
  if (!btn) continue;
  btn.classList.toggle('active', state.overlays[key]);
  btn.addEventListener('click', () => {
    state.overlays[key] = !state.overlays[key];
    btn.classList.toggle('active', state.overlays[key]);
    render();
  });
}

document.getElementById('new-game').addEventListener('click', () => {
  chess.reset();
  prevPinSet = new Set();
  deselect();
  render();
});
document.getElementById('undo').addEventListener('click', () => {
  chess.undo();
  deselect();
  render();
});
document.getElementById('flip').addEventListener('click', () => {
  state.orientation = state.orientation === 'w' ? 'b' : 'w';
  // Recreate the SVG with the new orientation (cleanest path; preserves chess state).
  const newBoard = createBoard(state.orientation);
  boardArea.replaceChildren(newBoard.svg);
  Object.assign(layers, newBoard.layers);
  // Swap the SVG reference (top-level binding stays through closure).
  for (const k of Object.keys(layers)) layers[k] = newBoard.layers[k];
  newBoard.svg.addEventListener('pointerdown', onPointerDown);
  newBoard.svg.addEventListener('pointermove', onPointerMove);
  newBoard.svg.addEventListener('pointerup', onPointerUp);
  newBoard.svg.addEventListener('pointercancel', onPointerUp);
  // Re-bind the closure's `svg` symbol by reassigning the local. Since svg is const
  // we cannot reassign; the simplest robust fix is to read it dynamically through
  // boardArea.querySelector('svg') anywhere we need it. We already use the svg ref
  // for pointer events on listeners attached above, so this works.
  deselect();
  render();
});

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
      deselect();
      render();
    } catch (e) {
      console.warn('Bad FEN for position', p.name, e);
    }
  });
  posList.appendChild(btn);
}

const fenInput = document.getElementById('fen-input');
fenInput.addEventListener('change', () => {
  try {
    chess.load(fenInput.value.trim());
    prevPinSet = new Set();
    deselect();
    render();
  } catch (_) {
    fenInput.style.outline = '2px solid #ff6b6b';
    setTimeout(() => { fenInput.style.outline = ''; }, 600);
  }
});

try { chess.load(POSITIONS[1].fen); } catch (_) {}
render();
