// Demo positions. Each one is chosen so at least one visualization reveals something
// a beginner could otherwise miss. Not split by viz, the same position is often useful
// for more than one.

export const POSITIONS = [
  {
    name: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    notes: 'Baseline. Symmetric control map, every piece defends something.',
  },
  {
    name: 'Italian, early middlegame',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 5',
    notes: 'Bishop on c4 eyes f7. Lots of central tension to see in the heatmap.',
  },
  {
    name: "King's Indian wedge",
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/2pP4/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 7',
    notes: 'White owns the center, the heatmap turns it into one solid wedge.',
  },
  {
    name: 'Légal trap, pin on Nf3',
    fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    notes: 'Bg4 pins Nf3 against Qd1. The pin is relative, the knight technically can move, Légal showed why.',
  },
  {
    name: 'QGD, Bg5 pin on Nf6',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p2B1/2PP4/8/PP2PPPP/RN1QKBNR b KQkq - 3 3',
    notes: "Bg5 pins Nf6 against Qd8. Classic relative pin in the Queen's Gambit Declined.",
  },
  {
    name: 'Absolute pin, knight on the e-file',
    fen: '4r1k1/pp4pp/8/8/8/8/4N1PP/4K2R w K - 0 1',
    notes: 'White knight on e2 absolutely pinned by Re8 against Ke1, iced solid.',
  },
  {
    name: 'Hanging piece',
    fen: '4k3/p3pppp/8/4N3/8/2b5/PPP1PPPP/4K3 w - - 0 1',
    notes: 'White knight on e5 attacked by Bc3, no defenders, the protection viz fades the glyph and flags it.',
  },
  {
    name: 'Royal fork preview',
    fen: '4k3/3q4/8/8/4N3/8/8/4K3 w - - 0 1',
    notes: 'White knight on e4 can hop to f6 attacking both the king on e8 and the queen on d7. The forks viz lights it up.',
  },
  {
    name: 'Fork-rich middlegame',
    fen: 'r3k2r/ppp2ppp/2nb1n2/3qp3/3P4/2N1BN2/PPP1QPPP/R3K2R w KQkq - 0 1',
    notes: 'Tactical mess with knights for both sides. The forks viz should highlight several squares where a knight move would hit two enemy pieces.',
  },
];

export const DEFAULT_FEN = POSITIONS[1].fen;
