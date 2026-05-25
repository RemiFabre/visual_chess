// Curated positions: each one is chosen so that one or more of the visualizations
// reveals an idea a beginner would otherwise miss.

export const POSITIONS = [
  {
    name: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    notes: 'Baseline. Symmetric control map; every piece defends something.',
    bestFor: ['viz1', 'viz2'],
  },
  {
    name: 'Italian, early middlegame',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 5',
    notes: 'Bishop on c4 eyes f7. Lots of central tension to see in the heatmap.',
    bestFor: ['viz1', 'viz2'],
  },
  {
    name: "King's Indian wedge",
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/2pP4/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 7',
    notes: 'White owns the center; the heatmap turns it into one solid wedge.',
    bestFor: ['viz1'],
  },
  {
    name: 'Légal trap — pin on Nf3',
    fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    notes: 'Bg4 pins Nf3 against Qd1. Relative pin — knight technically can move (Légal showed why).',
    bestFor: ['viz3'],
  },
  {
    name: 'QGD — Bg5 pin on Nf6',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p2B1/2PP4/8/PP2PPPP/RN1QKBNR b KQkq - 3 3',
    notes: 'Bg5 pins Nf6 against Qd8. Classic relative pin in the Queen\'s Gambit Declined.',
    bestFor: ['viz3'],
  },
  {
    name: 'Absolute pin — knight on the e-file',
    fen: '4r1k1/pp4pp/8/8/8/8/4N1PP/4K2R w K - 0 1',
    notes: 'White knight on e2 absolutely pinned by Re8 against Ke1. Iced solid.',
    bestFor: ['viz3'],
  },
  {
    name: 'Hanging piece',
    fen: '4k3/p3pppp/8/4N3/8/2b5/PPP1PPPP/4K3 w - - 0 1',
    notes: 'White knight on e5 attacked by Bc3, no defenders — red dashed ring, glyph fades.',
    bestFor: ['viz3'],
  },
  {
    name: 'Overloaded queen',
    fen: '6k1/1pp2ppp/p2p4/3P4/4P3/2Q2N2/PP3PPP/2R3K1 w - - 0 1',
    notes: 'White queen on c3 defends rook (c1), pawn (d4), and pawn (b2). Bubble swells, sweat drop appears.',
    bestFor: ['viz4'],
  },
  {
    name: 'Knight defends four pawns',
    fen: '4k3/8/8/4N3/2P3P1/3P1P2/8/4K3 w - - 0 1',
    notes: 'A knight in the middle defending four friendly pawns. Watch its bubble swell.',
    bestFor: ['viz4'],
  },
];

export const DEFAULT_FEN = POSITIONS[1].fen;
