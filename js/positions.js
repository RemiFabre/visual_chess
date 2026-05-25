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
  {
    name: 'Lone knight in the centre',
    fen: '8/8/8/3N4/8/8/8/8 w - - 0 1',
    notes: 'Knight reach theme, isolated. Single white knight on d5 on an otherwise empty board, the reach map fills almost everything inside 3 moves.',
  },
  {
    name: 'Deflection, Re8 lifts the d-file guard',
    fen: 'r2r2k1/p4pp1/1p1q3p/8/P7/7P/1P3PP1/R2QR1K1 w - - 0 1',
    notes: 'Deflection theme. Qd6 wears a dotted green ring: defended only by Rd8 (no pawn anchor). White plays Re8+! and after Rxe8 the d-file is clean, so Qxd6 wins the queen. Classic remove-the-defender.',
  },
  {
    name: 'Réti–Tartakower, the d-file battery',
    fen: 'rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9',
    notes: 'Discovered rook theme (Réti vs Tartakower, Berlin 1910). Rd1 is solid to Bd2, then dotted through Qd3 to d8 where the black king sits. White plays 9.Qd8+!! Kxd8 10.Bg5+ Bd2 moves and the rook smashes home with Rd1xd8#. Viz 2 makes the latent rook threat visible.',
  },
  {
    name: 'Pinned defender, Nf6 is not actually protected',
    fen: 'r4rk1/pp1p1ppp/1qp2n2/8/4P3/1P1P2Q1/PBP2PPP/R4RK1 w - - 0 1',
    notes: 'Pin theme. Nf6 looks safe (defended by Pg7, solid green ring), but Pg7 is pinned to the king by Qg3 (ice on g7). White plays Bxf6 winning the knight, the pawn can\'t recapture because it would expose Kg8.',
  },
  {
    name: 'Pinned pawn, mate on f6',
    fen: '1r1n1rk1/ppq2p2/2b2bp1/2pB3p/2P4P/4P3/PBQ2PP1/1R3RK1 w - - 0 1',
    notes: 'Pin theme #2. Pf7 is iced (pinned to Kg8 by Bd5), so fxg6 is illegal. White plays Qxg6+ and Kh8 is forced, then Bxf6 is mate on the long diagonal (the f7 pawn is gone, the king has nowhere to run).',
  },
  {
    name: "Mar del Plata, King's Indian main line",
    fen: 'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 1 9',
    notes: 'Space theme. The classic Mar del Plata wedge: white locks the centre with d5 and chases the queenside, black answers with kingside pawns. The Pressure overlay reads as one clear queenside-vs-kingside split.',
  },
  {
    name: 'Italian middlegame, both bishops out',
    fen: 'r2qk2r/ppp2ppp/2np1n2/2b1p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 1 8',
    notes: 'Pressure baseline. Both sides have developed actively (Bc4 vs Bc5, Bg4 pinning Nf3). The Pressure overlay reads as balanced central tension, no side dominates.',
  },
  {
    name: 'Italian Game opening',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    notes: 'Sight baseline. The classic Italian: e4 vs e5 pawns face each other, both bishops point at f-pawns, both knights developed. Great showcase for the attack-line overlay because pieces already point at things.',
  },
  {
    name: 'Simple pawn fork',
    fen: '7k/8/8/4b1n1/8/8/5PPP/5R1K w - - 0 1',
    notes: 'Sight puzzle. White plays f4 forking the bishop on e5 and the knight on g5. The pawn stub viz shows exactly which two squares a pawn on f4 would attack.',
  },
];

export const DEFAULT_FEN = POSITIONS[1].fen;
