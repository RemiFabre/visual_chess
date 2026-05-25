// Main entry — tab switching, position picking, dispatch to active viz.

import * as Viz1 from './viz1-control.js';
import * as Viz2 from './viz2-attacks.js';
import * as Viz3 from './viz3-pins.js';
import * as Viz4 from './viz4-thoughts.js';
import { POSITIONS, DEFAULT_FEN } from './positions.js';
import { setSpriteSupport } from './board.js';

const VIZ = {
  viz1: Viz1,
  viz2: Viz2,
  viz3: Viz3,
  viz4: Viz4,
};

const state = {
  activeViz: 'viz1',
  fen: DEFAULT_FEN,
  vizState: {
    viz1: { ...Viz1.DEFAULTS },
    viz2: { ...Viz2.DEFAULTS },
    viz3: { ...Viz3.DEFAULTS },
    viz4: { ...Viz4.DEFAULTS },
  },
};

const boardArea = document.getElementById('board-area');
const positionList = document.getElementById('position-list');
const fenInput = document.getElementById('fen-input');
const controlsBody = document.getElementById('controls-body');
const legendEl = document.getElementById('legend');

function rerender() {
  const viz = VIZ[state.activeViz];
  try {
    viz.render(boardArea, state.fen, state.vizState[state.activeViz]);
  } catch (e) {
    boardArea.innerHTML = `<div style="padding: 20px; color: #ff7a59;">Render error: ${e.message}</div>`;
    console.error(e);
  }
  viz.buildControls(controlsBody, state.vizState[state.activeViz], rerender);
  legendEl.innerHTML = viz.legendHTML();
}

function setActiveViz(viz) {
  state.activeViz = viz;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.viz === viz));
  rerender();
}

function setFen(fen) {
  state.fen = fen;
  fenInput.value = fen;
  document.querySelectorAll('.position-list button').forEach(b => {
    b.classList.toggle('active', b.dataset.fen === fen);
  });
  rerender();
}

// Wire tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => setActiveViz(tab.dataset.viz));
});

// Wire positions
positionList.replaceChildren();
for (const p of POSITIONS) {
  const btn = document.createElement('button');
  btn.dataset.fen = p.fen;
  btn.innerHTML = `<div>${p.name}</div><div class="pos-notes">${p.notes}</div>`;
  btn.addEventListener('click', () => setFen(p.fen));
  positionList.appendChild(btn);
}

// FEN input
fenInput.value = state.fen;
fenInput.addEventListener('change', () => {
  try {
    setFen(fenInput.value.trim());
  } catch (e) {
    boardArea.innerHTML = `<div style="padding: 20px; color: #ff7a59;">Bad FEN: ${e.message}</div>`;
  }
});

// Probe which sprite PNGs are actually present so we can switch to them automatically.
async function probeSprites() {
  const keys = [];
  for (const color of ['w', 'b']) for (const piece of 'KQRBNP') keys.push(`${color}${piece}`);
  const present = [];
  await Promise.all(keys.map(async (k) => {
    try {
      const r = await fetch(`sprites/piece_${k}.png`, { method: 'HEAD' });
      if (r.ok) present.push(k);
    } catch (_) {}
  }));
  if (present.length > 0) setSpriteSupport(true, present);
  rerender();
}

setFen(state.fen);
setActiveViz('viz1');
probeSprites();
