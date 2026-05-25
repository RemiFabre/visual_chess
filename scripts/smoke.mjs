// Quick smoke test for chess-utils. Run: node scripts/smoke.mjs

import { parseFEN, computeControl, computePins, computeDefendedMap, sqName } from '../js/chess-utils.js';

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('ok:', msg);
}

// Starting position.
{
  const { board } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const ctrl = computeControl(board);
  // d4 (idx of d4) should be attacked by 1 white pawn (c2) and 1 white pawn? Actually no — c2/e2 attack d3, not d4. White pawn on d2 doesn't attack d4 — pawns only attack diagonals.
  // c2 attacks b3 and d3. e2 attacks d3 and f3. So d3 is attacked by both pawns.
  const d3 = (8 - 3) * 8 + 3; // file=3 (d), rank=3 → idx = (7-2)*8 + 3 = 43
  // Wait — rankOf(idx) gives 0..7 where 0 = rank 1. d3 is rank 3, so r=2. idx = (7-2)*8 + 3 = 43.
  const idx_d3 = 43;
  assert(sqName(idx_d3) === 'd3', `sqName(43) should be d3, got ${sqName(idx_d3)}`);
  assert(ctrl[idx_d3].w.length === 2, `d3 attacked by 2 white pawns, got ${ctrl[idx_d3].w.length}`);

  // d2 itself is *defended* but the pawn on d2 doesn't attack d2. It's just a piece.
  // Knight on b1 attacks a3 and c3 and d2.
  // idx of c3 = (7-2)*8 + 2 = 42
  const idx_c3 = 42;
  assert(sqName(idx_c3) === 'c3', `sqName for c3 ok`);
  // c3 attackers: pawn on b2 (yes — b2 attacks a3 and c3), pawn on d2 (yes — d2 attacks c3 and e3), knight on b1 (yes — b1 attacks a3, c3, d2).
  assert(ctrl[idx_c3].w.length === 3, `c3 attacked by 3 white pieces, got ${ctrl[idx_c3].w.length}`);
}

// Pin test: simple absolute pin.
// Setup: white King e1, white Knight e2, black Rook e8. Knight pinned.
{
  const fen = '4r3/8/8/8/8/8/4N3/4K3 w - - 0 1';
  const { board } = parseFEN(fen);
  const pins = computePins(board);
  // e2 = file 4, rank 1 (idx 0-based rank). r=1. idx = (7-1)*8 + 4 = 52.
  const idx_e2 = 52;
  assert(sqName(idx_e2) === 'e2', 'sqName ok');
  assert(pins[idx_e2] && pins[idx_e2].severity === 'absolute', 'knight on e2 is absolute pinned');
}

// Relative pin: black Bishop h8, white Bishop d4, white Queen a1, white King h1.
// Diagonal h8-a1 is clear except for bB / wB / wQ, so d4 is pinned against the queen by the bishop.
{
  const fen = '7b/8/8/8/3B4/8/8/Q6K w - - 0 1';
  const { board } = parseFEN(fen);
  const pins = computePins(board);
  const idx_d4 = 35;
  assert(sqName(idx_d4) === 'd4', 'd4 ok');
  assert(pins[idx_d4] && pins[idx_d4].severity === 'relative', `relative pin at d4, got ${JSON.stringify(pins[idx_d4])}`);
}

// Defenders map: starting position — every back-rank piece is defended.
{
  const { board } = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const { defenders } = computeDefendedMap(board);
  // Pawn b2 is defended by Knight b1 (no — b1 attacks a3, c3, d2) and by Bishop on c1? c1 bishop is blocked.
  // Actually b2 is defended by: a1 rook? blocked by knight on b1. Hmm, no.
  // Better test: g2 pawn defended by knight g1? Knight on g1 attacks f3, h3, e2. No.
  // The bishop on f1 defends g2? f1 attacks e2 and g2. Yes — diagonal.
  // The king on e1 defends d1, d2, e2, f1, f2.
  // So pawn on f2 should be defended by king e1 and bishop f1? Bishop on f1 attacks e2, g2 — not f2.
  // King e1 attacks d1, d2, e2, f1, f2.
  // So f2 is defended by king (e1) only.
  // idx of f2: file=5, rank=1 → idx = (7-1)*8 + 5 = 53
  const idx_f2 = 53;
  assert(sqName(idx_f2) === 'f2', 'f2 ok');
  assert(defenders[idx_f2].length >= 1, `f2 defended by at least 1 piece, got ${defenders[idx_f2].length}`);
}

console.log('smoke done.');
