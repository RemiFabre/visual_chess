# Visual Chess

We're prototyping richer board visualizations for chess beginners: who controls each square, where attack lines actually run, which pieces are pinned, which pieces are quietly hanging.

See [STATUS.md](STATUS.md) for current state, screenshots, and notes.

## Run locally
```bash
open index.html
```
No build step. Vanilla HTML + ES modules, pieces come from the bundled Lichess SVG set in `vendor/lichess/cburnett/`.

## Live demo
https://remifabre.github.io/visual_chess/

## Regenerate sprites
We use OpenAI `gpt-image-1` to make the kawaii pieces and the ice/sweat-drop overlays. They're not used on the board anymore (we ship Lichess pieces instead) but the script and the PNGs are still in the repo if we want them later.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
export OPENAI_API_KEY=...
python3 scripts/generate_sprites.py
```
