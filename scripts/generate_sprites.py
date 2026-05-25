#!/usr/bin/env python3
"""Generate chess sprites with OpenAI gpt-image-1.

Outputs land in ../sprites/ next to the script. Existing files are skipped unless --force.

Usage:
  python3 scripts/generate_sprites.py                 # generate everything that's missing
  python3 scripts/generate_sprites.py --only piece    # only chess pieces (12 sprites)
  python3 scripts/generate_sprites.py --only ice      # only ice overlay
  python3 scripts/generate_sprites.py --only thought  # only thought bubble decorations
  python3 scripts/generate_sprites.py --force         # regenerate everything (overwrites)
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import os
import pathlib
import sys
import time

from openai import OpenAI

HERE = pathlib.Path(__file__).resolve().parent
OUT_DIR = HERE.parent / "sprites"
OUT_DIR.mkdir(exist_ok=True)

# ---- Style ------------------------------------------------------------------

STYLE_BASE = (
    "A single chess piece sprite for a kids-friendly chess teaching app. "
    "Cute kawaii art style: soft rounded silhouette, big friendly eyes, "
    "tiny neutral mouth, gentle cel shading, bold dark outlines. "
    "Front-facing 3/4 view, piece centered in the frame, no ground shadow, "
    "no background scenery. The background must be fully transparent (alpha). "
    "Crisp clean lines so the piece reads clearly at small sizes (64 px). "
)

PIECE_DESC = {
    "K": "a king, tall body topped with a small crown bearing a cross",
    "Q": "a queen, slightly shorter than the king, with a many-pointed crown",
    "R": "a rook, a chunky castle tower with battlement notches",
    "B": "a bishop, a slender piece with a tall pointed mitre that has a single slit",
    "N": "a knight, a friendly horse head, mane visible, facing slightly left",
    "P": "a pawn, small rounded body, a tiny head on a short neck",
}

COLOR_DESC = {
    "w": "ivory cream-white body with very subtle warm shading and dark navy outlines",
    "b": "deep charcoal-black body with very subtle cool highlights and bone-white outlines",
}

# ---- Sprite specs -----------------------------------------------------------

def piece_prompt(piece: str, color: str) -> str:
    return STYLE_BASE + (
        f"This piece is {PIECE_DESC[piece]}. "
        f"It has {COLOR_DESC[color]}. "
        "Single chess piece, isolated on transparent background."
    )

ICE_PROMPT = (
    "A wide pile of sharp jagged ice spikes filling the entire frame edge to edge. Aggressive "
    "and dangerous, multiple tall pointed peaks rising upward across the full width. Translucent "
    "pale-blue crystalline ice with bright white frost highlights on every facet, a few trapped "
    "bubbles, light sparkles. No straight lines anywhere, all edges sharp and crystalline. The "
    "base spans the full width of the frame, dramatic spikes reach upward toward the top. "
    "No face, no eyes, no mouth, no smile, no character of any kind, purely abstract ice "
    "formation. Fully transparent background outside the ice silhouette. Bold dark outlines, "
    "illustrated chess-sprite art style."
)

ICE_HALF_PROMPT = (
    "A wide low cluster of jagged ice spikes filling the frame width edge to edge. Exact same "
    "crystalline visual style as a taller ice pile, just shorter and less menacing. Multiple "
    "small pointed peaks spread across the width, gentle uneven silhouette rather than dramatic "
    "spikes. Translucent pale-blue ice with bright white frost highlights along every facet, a "
    "couple of trapped bubbles, light sparkles. No straight lines anywhere, all edges sharp and "
    "crystalline. No face, no eyes, no mouth, no smile, no character of any kind, purely abstract "
    "ice formation. Fully transparent background outside the ice silhouette. Bold dark outlines, "
    "same illustration style as the taller pile."
)

THOUGHT_BUBBLE_PROMPT = (
    "A blank cartoon thought bubble (cloud shape with three small connector circles trailing "
    "from the bottom-left corner). White interior with a thick dark outline. Empty inside, "
    "the inside will be filled in later. Slightly wider than tall, comic-book style. "
    "Fully transparent background outside the bubble shape."
)

SWEAT_DROP_PROMPT = (
    "A single blue cartoon sweat drop / anime-style stress drop. Teardrop shape, "
    "light blue with a white highlight, dark outline. Centered on a fully transparent background. "
    "Used as a small icon overlay to indicate that a character is stressed."
)

# ---- API call ---------------------------------------------------------------

def call_openai(client: OpenAI, prompt: str, size: str = "1024x1024") -> bytes:
    """Generate one image. Returns PNG bytes."""
    resp = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        background="transparent",
        quality="high",
    )
    b64 = resp.data[0].b64_json
    return base64.b64decode(b64)


def save(path: pathlib.Path, data: bytes) -> None:
    path.write_bytes(data)
    kb = len(data) / 1024
    print(f"  -> wrote {path.name}  ({kb:.0f} KB)")


def generate_one(client: OpenAI, name: str, prompt: str, force: bool, size: str = "1024x1024") -> bool:
    path = OUT_DIR / f"{name}.png"
    if path.exists() and not force:
        print(f"  -- skip (exists): {name}")
        return False
    print(f"  .. generating: {name}  ({size})")
    t0 = time.time()
    data = call_openai(client, prompt, size)
    save(path, data)
    print(f"     ({time.time() - t0:.1f}s)")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["piece", "ice", "thought", "all"], default="all")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--piece", help="Single piece letter (KQRBNP), implies --only piece")
    ap.add_argument("--color", choices=["w", "b"], help="Single color, pairs with --piece")
    args = ap.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not set", file=sys.stderr)
        return 1

    client = OpenAI()

    tasks: list[tuple[str, str, str]] = []  # (name, prompt, size)

    if args.piece:
        colors = [args.color] if args.color else ["w", "b"]
        for c in colors:
            tasks.append((f"piece_{c}{args.piece}", piece_prompt(args.piece, c), "1024x1024"))
    else:
        if args.only in ("piece", "all"):
            for color in ("w", "b"):
                for piece in "KQRBNP":
                    tasks.append((f"piece_{color}{piece}", piece_prompt(piece, color), "1024x1024"))
        if args.only in ("ice", "all"):
            # Landscape canvas, the ice spans the full width and stays low.
            tasks.append(("ice_full", ICE_PROMPT, "1536x1024"))
            tasks.append(("ice_half", ICE_HALF_PROMPT, "1536x1024"))
        if args.only in ("thought", "all"):
            tasks.append(("thought_bubble", THOUGHT_BUBBLE_PROMPT, "1024x1024"))
            tasks.append(("sweat_drop", SWEAT_DROP_PROMPT, "1024x1024"))

    print(f"{len(tasks)} sprite(s) to consider; force={args.force}; out={OUT_DIR}")
    # Parallelize up to N at a time, the API is happy with a few concurrent calls.
    PAR = 4
    generated = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=PAR) as pool:
        futs = {pool.submit(generate_one, client, name, prompt, args.force, size): name for name, prompt, size in tasks}
        for f in concurrent.futures.as_completed(futs):
            try:
                if f.result():
                    generated += 1
            except Exception as e:
                print(f"  !! error for {futs[f]}: {e}", file=sys.stderr)
    print(f"done. generated {generated} sprite(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
