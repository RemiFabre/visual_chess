// Curated positions: each one is chosen so that one or more of the visualizations
// reveals an idea a beginner would otherwise miss.

export const POSITIONS = [
  {
    name: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    notes: 'Baseline. Useful to show the controlled-space viz on a symmetric board.',
    bestFor: ['viz1', 'viz2'],
  },
  {
    name: 'Italian, early middlegame',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 5',
    notes: 'White bishop on c4 eyes f7. Lots of tension and central control to visualize.',
    bestFor: ['viz1', 'viz2'],
  },
  {
    name: 'Classic pin (Légal trap setup)',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    notes: "Bishop pins, knight pins — gentle intro to absolute vs relative pins.",
    bestFor: ['viz3'],
  },
  {
    name: 'Knight pinned on f6, queen overworked',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5',
    notes: 'Symmetric Giuoco. Used to show how a single piece can defend multiple things at once.',
    bestFor: ['viz3', 'viz4'],
  },
  {
    name: 'Overloaded queen',
    fen: '2r3k1/pp3ppp/3q1n2/3p4/3P4/2Q2N2/PP3PPP/2R3K1 w - - 0 1',
    notes: 'White queen on c3 defends c1 (rook) and d4 (pawn). Black queen on d6 defends d5 (pawn). Watch the thought bubbles.',
    bestFor: ['viz4'],
  },
  {
    name: 'Space advantage (King\'s Indian-ish)',
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/2pP4/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 7',
    notes: 'White has a wedge of central control; the heatmap should make this obvious.',
    bestFor: ['viz1'],
  },
];

export const DEFAULT_FEN = POSITIONS[1].fen;
