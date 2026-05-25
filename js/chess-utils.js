// Minimal chess utilities: FEN parsing, attacker enumeration, pin detection.
// No external deps so the page works from file:// directly.

export const FILES = 'abcdefgh';
export const RANKS = '12345678';

// Board representation: a 64-length array indexed 0..63 where 0 = a8, 7 = h8, 56 = a1, 63 = h1.
// Each cell is null or { piece: 'P'|'N'|..., color: 'w'|'b', square: 'e4' }.
// Yes this matches the natural reading order of a FEN ranks string.

export function sqIndex(file, rank) {
  // file 0..7 (a..h), rank 0..7 (1..8 with 0 = rank 1)
  return (7 - rank) * 8 + file;
}

export function sqName(idx) {
  const file = idx % 8;
  const rank = 7 - Math.floor(idx / 8);
  return FILES[file] + RANKS[rank];
}

export function fileOf(idx) { return idx % 8; }
export function rankOf(idx) { return 7 - Math.floor(idx / 8); } // 0..7 where 0 = rank 1

export function parseFEN(fen) {
  const [placement, turn = 'w', castling = '-', ep = '-', halfmove = '0', fullmove = '1'] = fen.trim().split(/\s+/);
  const board = new Array(64).fill(null);
  const ranks = placement.split('/');
  if (ranks.length !== 8) throw new Error('Bad FEN: expected 8 ranks');
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of ranks[r]) {
      if (/\d/.test(ch)) { file += parseInt(ch, 10); continue; }
      const color = ch === ch.toUpperCase() ? 'w' : 'b';
      const piece = ch.toUpperCase();
      const idx = r * 8 + file;
      board[idx] = { piece, color, square: sqName(idx) };
      file++;
    }
    if (file !== 8) throw new Error(`Bad FEN: rank ${8 - r} has ${file} files`);
  }
  return { board, turn, castling, ep, halfmove: +halfmove, fullmove: +fullmove };
}

// --- Move/attack generation ---------------------------------------------------
// For each piece type, we list the rays / jumps it generates *attacks* on.
// "attacks" means: squares this piece could capture on if the right enemy piece sat there.

const KNIGHT_OFFSETS = [[+1,+2],[+2,+1],[+2,-1],[+1,-2],[-1,-2],[-2,-1],[-2,+1],[-1,+2]];
const KING_OFFSETS = [[+1,0],[+1,+1],[0,+1],[-1,+1],[-1,0],[-1,-1],[0,-1],[+1,-1]];
const BISHOP_DIRS = [[+1,+1],[+1,-1],[-1,+1],[-1,-1]];
const ROOK_DIRS = [[+1,0],[-1,0],[0,+1],[0,-1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

function inBounds(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
function idxOf(f, r) { return sqIndex(f, r); }

// Returns an array of { from: idx, to: idx, ray: [idx,...], blockedBy: idx|null, type: 'jump'|'ray'|'pawn'|'king' }
// describing every attack vector the piece on `from` produces, with the squares of the ray and where it stops.
export function pieceAttackVectors(board, from) {
  const p = board[from];
  if (!p) return [];
  const f = fileOf(from), r = rankOf(from);
  const out = [];

  const addJump = (df, dr) => {
    const nf = f + df, nr = r + dr;
    if (!inBounds(nf, nr)) return;
    const to = idxOf(nf, nr);
    out.push({ from, to, ray: [to], blockedBy: board[to] ? to : null, type: 'jump' });
  };

  const addRay = (df, dr) => {
    let nf = f + df, nr = r + dr;
    const ray = [];
    let stopAt = null;
    while (inBounds(nf, nr)) {
      const to = idxOf(nf, nr);
      ray.push(to);
      if (board[to]) { stopAt = to; break; }
      nf += df; nr += dr;
    }
    if (ray.length) {
      out.push({ from, to: stopAt ?? ray[ray.length - 1], ray, blockedBy: stopAt, type: 'ray', dir: [df, dr] });
    }
  };

  switch (p.piece) {
    case 'P': {
      const dir = p.color === 'w' ? +1 : -1;
      for (const df of [-1, +1]) {
        const nf = f + df, nr = r + dir;
        if (inBounds(nf, nr)) {
          const to = idxOf(nf, nr);
          out.push({ from, to, ray: [to], blockedBy: board[to] ? to : null, type: 'pawn' });
        }
      }
      break;
    }
    case 'N':
      for (const [df, dr] of KNIGHT_OFFSETS) addJump(df, dr);
      break;
    case 'B':
      for (const [df, dr] of BISHOP_DIRS) addRay(df, dr);
      break;
    case 'R':
      for (const [df, dr] of ROOK_DIRS) addRay(df, dr);
      break;
    case 'Q':
      for (const [df, dr] of QUEEN_DIRS) addRay(df, dr);
      break;
    case 'K':
      for (const [df, dr] of KING_OFFSETS) addJump(df, dr);
      break;
  }
  return out;
}

// For each square 0..63, return:
//   { w: [fromIdx,...], b: [fromIdx,...] }   pieces of that color whose attack vector ends on this square
// "Ends on" = the first blocker square or the edge for sliders; the destination for jumps/pawns/king.
export function computeAttackMap(board) {
  const map = Array.from({ length: 64 }, () => ({ w: [], b: [] }));
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const vectors = pieceAttackVectors(board, i);
    for (const v of vectors) {
      // Each square along the ray up to (and including) the blocker is "attacked" only at the blocker square
      // for control purposes, except: sliders also pass *through* empty squares — those are controlled too.
      // For "control of a square" we want: every square along the ray up to and including the first blocker
      // (the blocker square is also attacked — you could capture it).
      for (const sq of v.ray) {
        map[sq][p.color].push(i);
      }
    }
  }
  return map;
}

export function findKing(board, color) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.piece === 'K' && p.color === color) return i;
  }
  return -1;
}

// Is the king of `color` in check on this board?
export function inCheck(board, color) {
  const k = findKing(board, color);
  if (k < 0) return false;
  return isSquareAttackedBy(board, k, color === 'w' ? 'b' : 'w');
}

export function isSquareAttackedBy(board, sq, byColor) {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p.color !== byColor) continue;
    const vectors = pieceAttackVectors(board, i);
    for (const v of vectors) {
      if (v.ray.includes(sq)) return true;
    }
  }
  return false;
}

// Pin detection: for each non-king piece, if removing it puts own king in check (from a single sliding attacker
// along a line through the king), it's pinned. We return per-square pin info:
//   { pinnedBy: idx, pinnedTo: idx (the piece "behind"), pinLine: [idx,...], severity: 'absolute'|'relative' }
// "absolute" = pinned against the king. "relative" against queen / higher-value piece behind it.
export function computePins(board) {
  const pins = new Array(64).fill(null);

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (!piece || piece.piece === 'K') continue;

    // Try removing this piece and look for a slider attacker through it to a more valuable piece.
    const cloned = board.slice();
    cloned[i] = null;

    // For every enemy slider, see if its ray now passes through square i and ends on a friendly piece worth pinning.
    const enemy = piece.color === 'w' ? 'b' : 'w';
    for (let j = 0; j < 64; j++) {
      const attacker = cloned[j];
      if (!attacker || attacker.color !== enemy) continue;
      if (!'BRQ'.includes(attacker.piece)) continue;

      const vectors = pieceAttackVectors(cloned, j);
      for (const v of vectors) {
        if (v.type !== 'ray') continue;
        // Only consider attackers along ray directions that match the piece type
        const isDiag = Math.abs(v.dir[0]) === 1 && Math.abs(v.dir[1]) === 1;
        const isOrth = (v.dir[0] === 0) !== (v.dir[1] === 0);
        if (attacker.piece === 'B' && !isDiag) continue;
        if (attacker.piece === 'R' && !isOrth) continue;
        // Q does both — fine.

        const rayIdx = v.ray.indexOf(i);
        if (rayIdx < 0) continue;
        // The piece behind i on the same ray is v.ray[rayIdx+1..end] up to first blocker.
        // Actually: after removing piece i, the ray continues until it hits a piece — that piece is the blocker.
        // But the *ray* we computed already accounts for piece i being removed. So v.blockedBy is the piece
        // behind i (or null if ray went to edge).
        const behindIdx = v.blockedBy;
        if (behindIdx == null) continue;
        const behind = cloned[behindIdx];
        if (!behind || behind.color !== piece.color) continue;

        // We have a pin. Severity:
        let severity = 'relative';
        if (behind.piece === 'K') severity = 'absolute';
        else if (pieceValue(behind.piece) > pieceValue(piece.piece)) severity = 'relative';
        else continue; // pinning a piece against a less valuable piece isn't a meaningful pin

        // pinLine: from attacker through to the behind piece, all squares.
        const pinLine = [j, ...v.ray.slice(0, v.ray.indexOf(behindIdx) + 1)];
        const existing = pins[i];
        // Prefer absolute pins over relative ones.
        if (!existing || (severity === 'absolute' && existing.severity !== 'absolute')) {
          pins[i] = { pinnedBy: j, pinnedTo: behindIdx, pinLine, severity, behindPiece: behind.piece };
        }
      }
    }
  }
  return pins;
}

export function pieceValue(p) {
  return { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 1000 }[p] || 0;
}

// For each piece on the board, the list of friendly pieces it defends (i.e. friendly pieces that sit on a square
// attacked by this piece). Used for thought bubbles + protection rendering.
export function computeDefendedMap(board) {
  // For each square that holds a piece, who defends it?
  const defenders = Array.from({ length: 64 }, () => []);
  // And who does each piece defend? (inverse)
  const defending = Array.from({ length: 64 }, () => []);
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const vectors = pieceAttackVectors(board, i);
    for (const v of vectors) {
      for (const sq of v.ray) {
        const target = board[sq];
        if (target && target.color === p.color && sq !== i) {
          defenders[sq].push(i);
          defending[i].push(sq);
        }
      }
    }
  }
  return { defenders, defending };
}

// Who attacks each square (per color), but stopping the ray *at* the first blocker
// (the blocker itself is included — you can capture it). This is what we want for control.
// Already computed by computeAttackMap — alias.
export const computeControl = computeAttackMap;
