#!/usr/bin/env python3
"""Caption the chosen screenshots for the Reddit post.

Reads slide definitions from ../reddit_captions.md (gitignored, user editable). Each slide block
is bounded by an `## filename.png` heading, followed by `- key: value` lines for metadata
(`src`, `fen`, `title`), then a blank line, then the body text up to the next slide heading.

Writes captioned PNGs to ../reddit_images/.
"""

from __future__ import annotations

import pathlib
import re
import sys
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
SCREENS = HERE.parent / "screenshots"
OUT = HERE.parent / "reddit_images"
CAPTIONS = HERE.parent / "reddit_captions.md"
OUT.mkdir(exist_ok=True)

FONT_BOLD = "/System/Library/Fonts/Helvetica.ttc"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"


@dataclass
class Slide:
    out_name: str
    src: str
    title: str
    text: str
    fen: str | None = None


HEADING_RE = re.compile(r"^## +(\S+)\s*$")
META_RE = re.compile(r"^-\s*(\w+)\s*:\s*(.+)$")


def parse_captions(text: str) -> list[Slide]:
    slides: list[Slide] = []
    current: dict | None = None
    body_lines: list[str] = []

    def flush() -> None:
        nonlocal current, body_lines
        if current is None:
            return
        text_body = "\n".join(body_lines).strip()
        slides.append(Slide(
            out_name=current["filename"],
            src=current.get("src", ""),
            title=current.get("title", ""),
            text=text_body,
            fen=current.get("fen"),
        ))
        current = None
        body_lines = []

    in_body = False
    for raw in text.splitlines():
        line = raw.rstrip()
        m = HEADING_RE.match(line)
        if m:
            flush()
            current = {"filename": m.group(1)}
            in_body = False
            continue
        if current is None:
            continue
        if not in_body:
            m = META_RE.match(line)
            if m:
                current[m.group(1).lower()] = m.group(2).strip()
                continue
            if line.strip() == "":
                in_body = True
                continue
            # Unexpected line in the metadata section; treat as body.
            in_body = True
            body_lines.append(line)
            continue
        body_lines.append(line)
    flush()
    return slides


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
    TARGET_W = 1400
    scale = TARGET_W / img.width
    img = img.resize((TARGET_W, int(img.height * scale)), Image.LANCZOS)
    w = TARGET_W

    pad = 32
    title_font = load_font(FONT_BOLD, 40)
    body_font = load_font(FONT_BOLD, 24)
    fen_font = load_font(FONT_MONO, 20)
    fen_label_font = load_font(FONT_BOLD, 20)

    draw_probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    title_height = title_font.getbbox(slide.title)[3] + pad
    body_lines = wrap(draw_probe, slide.text, body_font, w - 2 * pad)
    body_height = sum(body_font.getbbox(ln)[3] + 6 for ln in body_lines) + pad
    top_band = pad + title_height + body_height

    fen_strip = 0
    if slide.fen:
        fen_strip = pad + fen_label_font.getbbox("FEN")[3] + 6 + fen_font.getbbox(slide.fen)[3] + pad

    total_h = top_band + img.height + fen_strip
    canvas = Image.new("RGBA", (w, total_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, w, top_band), fill=(245, 240, 235, 255))
    draw.text((pad, pad), slide.title, fill=(40, 40, 40, 255), font=title_font)
    y = pad + title_height
    for line in body_lines:
        draw.text((pad, y), line, fill=(90, 90, 90, 255), font=body_font)
        y += body_font.getbbox(line)[3] + 6

    canvas.paste(img, (0, top_band), img)

    if slide.fen:
        fy = top_band + img.height
        draw.rectangle((0, fy, w, total_h), fill=(245, 240, 235, 255))
        draw.text((pad, fy + pad), "FEN", fill=(120, 120, 120, 255), font=fen_label_font)
        draw.text((pad + 60, fy + pad), slide.fen, fill=(40, 40, 40, 255), font=fen_font)

    out = OUT / slide.out_name
    canvas.convert("RGB").save(out, "PNG", optimize=True)
    return out


def main() -> int:
    if not CAPTIONS.exists():
        print(f"missing captions file: {CAPTIONS}", file=sys.stderr)
        return 1
    slides = parse_captions(CAPTIONS.read_text())
    if not slides:
        print(f"no slides parsed from {CAPTIONS}", file=sys.stderr)
        return 1
    n = 0
    for slide in slides:
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
