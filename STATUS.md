# Visual Chess, status

The single place to look at what's done, what's broken, and what we're trying next.

## The idea
Chess is a visual game but a standard board hides almost everything a beginner is supposed to "see": who controls each square, where attack lines actually run, which pieces are pinned, which pieces are silently hanging. We're prototyping a few visualizations layered on a normal board to find out whether any of them genuinely help.

## How to view
- Live: https://remifabre.github.io/visual_chess/
- Local: `open index.html` from the repo root, no build step.

The `*.github.io` URL is the Pages site; the `github.com/.../blob/main/index.html` URL is just GitHub's source viewer.

## Visualizations

### 1. Controlled space
Each side colors only its half of the square's border: white on the bottom half, black on the top. When both sides attack a square, the two halves meet face-to-face at the side edges. Border thickness grows with attacker count (capped at 4). Numbers sit on each side's half too: white's count near the bottom, black's near the top. A second mode hides the colors and shows just the digits.

![viz1, Italian middlegame](screenshots/viz1_1_italian-early-middlegame.png)
![viz1, King's Indian wedge](screenshots/viz1_2_king-s-indian-wedge.png)

### 2. Attack paths
All arrows use the same uniform style. Solid up to the first piece in the way; dotted continuation past that piece showing the rest of the ray. Only knights are curved, since their move isn't a straight line. Filters for side and piece type to declutter the opening.

![viz2, Italian middlegame](screenshots/viz2_1_italian-early-middlegame.png)

### 3. Pins & protection
Pinned pieces get an ice overlay. Ice height grows with the value differential of what's behind: a pawn pinned against a knight is just a thin sliver; a knight pinned against the king is the full block. Opacity stays low enough that the pinned piece is still readable underneath.

The pin line is dashed in the attacker's color (orange = white pinning, blue = black pinning) so the direction reads. Defended pieces get a green inset ring (thicker = more defenders). Hanging pieces (attacked and undefended) get a red dashed ring and the glyph fades.

![viz3, Légal pin](screenshots/viz3_3_l-gal-trap-pin-on-nf3.png)
![viz3, absolute pin](screenshots/viz3_5_absolute-pin-knight-on-the-e-file.png)
![viz3, hanging piece](screenshots/viz3_6_hanging-piece.png)

## Sprites
We generated a kawaii set with OpenAI `gpt-image-1` early on. They're still in `sprites/` because they're useful (the ice overlays for viz 3) but the board itself now uses the standard Lichess `cburnett` pieces, which are familiar enough that they don't add extra confusion. To regenerate or extend:

```bash
source .venv/bin/activate
python3 scripts/generate_sprites.py            # only fills in missing files
python3 scripts/generate_sprites.py --force    # regenerate everything
python3 scripts/generate_sprites.py --piece N --color w   # one specific sprite
```
Originals are 1024x1024 (~1.5 MB each). `sips -Z 384 sprites/*.png` brings the bundle down to ~1.5 MB total, visually identical at our 90 px squares.

## Demo positions
Listed in `js/positions.js`. Currently seven, each one chosen because at least one visualization reveals something on it:

- Starting position
- Italian, early middlegame
- King's Indian wedge
- Légal trap, pin on Nf3
- QGD, Bg5 pin on Nf6
- Absolute pin, knight on the e-file
- Hanging white knight

## Ideas we haven't built yet
- Click a piece to isolate just its arrows. The opening position is too busy for viz 2 otherwise.
- Diff against the previous move: fade the old control map and overlay the new one to show *what changed*.
- "What if?" mode: drag a piece to a hypothetical square and recompute the visualizations live.
- Static-exchange tint on the hanging ring, so the red is brighter when the capture actually wins material vs. when it's just one defender short on paper.
- A fifth viz for immediate threat squares: any square where the opponent has a profitable capture next move.

## Commit log
`git log --oneline` for the running picture. Public repo: https://github.com/RemiFabre/visual_chess.
