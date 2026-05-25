#!/usr/bin/env python3
"""Caption the chosen screenshots for the Reddit post.

Reads from ../screenshots/ and writes captioned versions to ../reddit_images/.
Each output has a title bar across the top, an optional subtitle band, and an
optional FEN strip across the bottom so the post-reader can copy it into Lichess.

The set lives in `IMAGES` below; tweak there to change order, titles, or FENs.
"""

from __future__ import annotations

import pathlib
import sys
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
SCREENS = HERE.parent / "screenshots"
OUT = HERE.parent / "reddit_images"
OUT.mkdir(exist_ok=True)

FONT_BOLD = "/System/Library/Fonts/Helvetica.ttc"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"


@dataclass
class Slide:
    out_name: str
    src: str
    title: str
    subtitle: str
    fen: str | None = None


# Order chosen for the post: lead with the most striking puzzle, alternate puzzle / basic
# inside each overlay so the reader gets the "wow" first and the explainer second.
IMAGES: list[Slide] = [
    Slide(
        "01-overlay3-deflection.png",
        "viz3_11_deflection-the-weak-defender.png",
        "Overlay 3 · Deflection",
        "Nc6 wears a dotted green ring: defended only by Bb7, no pawn anchor. Bb7 itself is hanging (red ring). White plays Rxb7! and then Nxc6 wins the knight too.",
        "5rk1/1b3ppp/2n1p3/3pN3/3P4/4P3/P1P2PPP/1R4K1 w - - 0 1",
    ),
    Slide(
        "02-overlay3-absolute-pin.png",
        "viz3_5_absolute-pin-knight-on-the-e-file.png",
        "Overlay 3 · Pins & protection · baseline",
        "Big tall ice = absolute pin against the king. Small low ice would mean a lesser pin. Green rings = defended (solid = pawn-anchored, dotted = piece-only).",
        "4r1k1/pp4pp/8/8/8/8/4N1PP/4K2R w K - 0 1",
    ),
    Slide(
        "03-overlay2-réti.png",
        "viz2_12_r-ti-tartakower-the-d-file-battery.png",
        "Overlay 2 · Discovered rook (Réti vs Tartakower, 1910)",
        "White's rook on d1 attacks its own bishop on d2 (solid), then the dotted continuation walks all the way up to d8 through Qd3. The famous 9.Qd8+!! Kxd8 10.Bg5+ exposes the rook on d8.",
        "rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9",
    ),
    Slide(
        "04-overlay2-starting.png",
        "viz2_0_starting-position.png",
        "Overlay 2 · Attack paths · baseline",
        "Pawns get thick stubs (chunky = pawn protection is strong). Sliders go solid to the first blocker then dotted to the board edge. Knights are intentionally not drawn (too noisy in the opening). Kings get tiny in-square spokes.",
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    ),
    Slide(
        "05-overlay1-kid-wedge.png",
        "viz1_2_king-s-indian-wedge.png",
        "Overlay 1 · Space dominance",
        "Each contested square is split proportionally. White's peach floods the bottom of the board (massive central pressure); black's blue dominates the top. Empty board colour means nobody attacks the square.",
        "r1bq1rk1/pp2ppbp/2np1np1/2pP4/2P1P3/2N2N2/PP3PPP/R1BQKB1R w KQ - 0 7",
    ),
    Slide(
        "06-overlay1-italian.png",
        "viz1_1_italian-early-middlegame.png",
        "Overlay 1 · Controlled space · baseline",
        "Central tension is the orange/blue mosaic in the middle. 4/0 = white has 4 attackers on the square and black has none, so the square is solid orange. 2/2 splits half/half.",
        "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 5",
    ),
]


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        cand = (cur + " " + w).strip()
        if draw.textlength(cand, font=font) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def caption(slide: Slide) -> pathlib.Path:
    src_path = SCREENS / slide.src
    if not src_path.exists():
        raise FileNotFoundError(src_path)
    img = Image.open(src_path).convert("RGBA")
    # Normalize every input to a consistent display width so the title bar / FEN strip
    # use the same proportions regardless of which screenshot the input came from.
    TARGET_W = 1400
    scale = TARGET_W / img.width
    img = img.resize((TARGET_W, int(img.height * scale)), Image.LANCZOS)
    w = TARGET_W

    pad = 32
    title_font = load_font(FONT_BOLD, 40)
    sub_font = load_font(FONT_BOLD, 24)
    fen_font = load_font(FONT_MONO, 20)
    fen_label_font = load_font(FONT_BOLD, 20)

    # Layout: title bar at the top (white), board in the middle, FEN strip at the bottom.
    draw_probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    title_height = title_font.getbbox(slide.title)[3] + pad
    sub_lines = wrap(draw_probe, slide.subtitle, sub_font, w - 2 * pad)
    sub_height = sum(sub_font.getbbox(ln)[3] + 6 for ln in sub_lines) + pad
    top_band = pad + title_height + sub_height

    fen_strip = 0
    if slide.fen:
        fen_strip = pad + fen_label_font.getbbox("FEN")[3] + 6 + fen_font.getbbox(slide.fen)[3] + pad

    total_h = top_band + img.height + fen_strip
    canvas = Image.new("RGBA", (w, total_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    # Title bar background
    draw.rectangle((0, 0, w, top_band), fill=(245, 240, 235, 255))

    # Title
    draw.text((pad, pad), slide.title, fill=(40, 40, 40, 255), font=title_font)

    # Subtitle (wrapped)
    y = pad + title_height
    for line in sub_lines:
        draw.text((pad, y), line, fill=(90, 90, 90, 255), font=sub_font)
        y += sub_font.getbbox(line)[3] + 6

    # Board
    canvas.paste(img, (0, top_band), img)

    # FEN strip
    if slide.fen:
        fy = top_band + img.height
        draw.rectangle((0, fy, w, total_h), fill=(245, 240, 235, 255))
        draw.text((pad, fy + pad), "FEN", fill=(120, 120, 120, 255), font=fen_label_font)
        draw.text((pad + 60, fy + pad), slide.fen, fill=(40, 40, 40, 255), font=fen_font)

    out = OUT / slide.out_name
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    return out


def main() -> int:
    n = 0
    for slide in IMAGES:
        try:
            path = caption(slide)
            kb = path.stat().st_size / 1024
            print(f"  -> {path.name}  ({kb:.0f} KB)")
            n += 1
        except FileNotFoundError as e:
            print(f"  !! missing: {e}", file=sys.stderr)
    print(f"wrote {n} captioned image(s) to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
