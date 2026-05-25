// Demo positions. Each one is picked so at least one visualization reveals something
// a beginner could otherwise miss. The "theme" line in each note says which visualization
// the position is best at illustrating.

export const POSITIONS = [
  {
    name: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    notes: 'Baseline. Symmetric control map; everyone defends everyone.',
  },
  {
    name: 'Italian, early middlegame',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 5',
    notes: 'Central tension theme. Bishop on c4 eyes f7, multiple attackers and defenders on d4/d5/e5.',
  },
  {
    name: "King's Indian wedge",
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/2pP4/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 7',
    notes: 'Space theme. White owns the center; the heatmap turns it into one solid wedge.',
  },
  {
    name: 'Légal trap, pin on Nf3',
    fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    notes: 'Relative pin theme. Bg4 pins Nf3 against Qd1; Bc4 also pins f7 against Ng8.',
  },
  {
    name: 'QGD, Bg5 pin on Nf6',
    fen: 'rnbqkb1r/ppp1pppp/5n2/3p2B1/2PP4/8/PP2PPPP/RN1QKBNR b KQkq - 3 3',
    notes: 'Relative pin theme. Classic QGD bishop pin against the queen.',
  },
  {
    name: 'Absolute pin, knight on the e-file',
    fen: '4r1k1/pp4pp/8/8/8/8/4N1PP/4K2R w K - 0 1',
    notes: 'Absolute pin theme. Nf2 cannot move, the rook on e8 would capture the king.',
  },
  {
    name: 'Hanging knight in the centre',
    fen: '4k3/p3pppp/8/4N3/8/2b5/PPP1PPPP/4K3 w - - 0 1',
    notes: 'Hanging-piece theme. The white knight on e5 is attacked by Bc3 with zero defenders.',
  },
  {
    name: 'Centralized knight outpost',
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/3N4/2P1P3/5N2/PP3PPP/R1BQKB1R w KQ - 0 1',
    notes: 'Knight reach theme. The d5 knight is the textbook outpost, the reach map should fill most of the board in 3 moves.',
  },
  {
    name: 'Royal fork preview',
    fen: '4k3/3q4/8/8/4N3/8/8/4K3 w - - 0 1',
    notes: 'Knight fork theme. White hops Nf6 to fork K + Q. The reach map shows f6 sits one move away.',
  },
  {
    name: 'Fork-pattern playground',
    fen: 'r1bqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/R1BQKBNR w KQkq - 0 1',
    notes: 'Fork-pattern theme. Knights hidden in viz 5, several constellations light up around d6, e6, f6, b6, etc.',
  },
];

export const DEFAULT_FEN = POSITIONS[1].fen;
