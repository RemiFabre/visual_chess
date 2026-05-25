# Visual Chess

Prototyping richer visualizations for chess beginners — controlled squares, attack paths, pins, overloaded defenders.

See **[STATUS.md](STATUS.md)** for current state, demo links, and screenshots.

## Run locally
```bash
open index.html
```
No build step. Uses `chess.js` from a CDN.

## Generate sprites
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
export OPENAI_API_KEY=...
python3 scripts/generate_sprites.py
```
