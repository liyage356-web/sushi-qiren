"""Render labelled street-entry placement candidates for visual QA."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = ROOT / "web" / "images" / "tianjin-street-scene-reference-v5.png"
ENTRY_DIR = ROOT / "web" / "images" / "street-entries"
OUTPUT = ROOT / "output"

CANDIDATES = {
    "candy": {
        "file": "yu-liu-candy-carrier.png",
        "crop": (360, 455, 720, 925),
        "items": [
            (364, 499, 0.318),
        ],
    },
    "heitou": {
        "file": "hei-tou-pair.png",
        "crop": (880, 455, 1280, 925),
        "items": [
            (940, 486, 0.315),
        ],
    },
    "baozi": {
        "file": "gou-bu-li-bun-carrier.png",
        "crop": (1040, 390, 1520, 925),
        "items": [(1104, 481, 0.283)],
    },
    "clay": {
        "file": "ni-ren-zhang-sign.png",
        "crop": (640, 330, 860, 600),
        "items": [(687, 381, 0.080)],
    },
}


def font() -> ImageFont.ImageFont:
    for candidate in (
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), 18)
    return ImageFont.load_default()


def skin_components(image: Image.Image, limit: int = 8) -> list[dict[str, int]]:
    rgba = np.asarray(image.convert("RGBA"))
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    mask = (
        (rgba[:, :, 3] > 80)
        & (red > 125)
        & (red - green > 12)
        & (green > 55)
        & (blue < 220)
    )
    seen = np.zeros(mask.shape, dtype=bool)
    components: list[dict[str, int]] = []
    height, width = mask.shape
    for y, x in np.argwhere(mask):
        if seen[y, x]:
            continue
        stack = [(int(y), int(x))]
        seen[y, x] = True
        area = 0
        min_x = width
        min_y = height
        max_x = 0
        max_y = 0
        while stack:
            current_y, current_x = stack.pop()
            area += 1
            min_x = min(min_x, current_x)
            min_y = min(min_y, current_y)
            max_x = max(max_x, current_x)
            max_y = max(max_y, current_y)
            for next_y, next_x in (
                (current_y - 1, current_x),
                (current_y + 1, current_x),
                (current_y, current_x - 1),
                (current_y, current_x + 1),
            ):
                if (
                    0 <= next_y < height
                    and 0 <= next_x < width
                    and mask[next_y, next_x]
                    and not seen[next_y, next_x]
                ):
                    seen[next_y, next_x] = True
                    stack.append((next_y, next_x))
        if area >= 25:
            components.append(
                {
                    "area": area,
                    "left": min_x,
                    "top": min_y,
                    "right": max_x + 1,
                    "bottom": max_y + 1,
                }
            )
    return sorted(components, key=lambda item: item["area"], reverse=True)[:limit]


def build(key: str, config: dict) -> None:
    background = Image.open(BACKGROUND).convert("RGBA")
    source = Image.open(ENTRY_DIR / config["file"]).convert("RGBA")
    labels = font()
    tiles: list[Image.Image] = []
    left, top, right, bottom = config["crop"]

    for x, y, scale in config["items"]:
        canvas = background.copy()
        figure = source.resize(
            (
                max(1, round(source.width * scale)),
                max(1, round(source.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        canvas.alpha_composite(figure, (x, y))
        tile = canvas.crop(config["crop"]).convert("RGB")
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, 288, 32), fill=(248, 243, 229))
        draw.text(
            (8, 5),
            f"x={x}  y={y}  scale={scale:.3f}",
            fill=(28, 31, 27),
            font=labels,
        )
        tiles.append(tile)

    columns = 3 if len(config["items"]) > 1 else 1
    rows = (len(config["items"]) + columns - 1) // columns
    width = (right - left) * columns
    height = (bottom - top) * rows
    sheet = Image.new("RGB", (width, height), (240, 236, 224))
    tile_width = right - left
    tile_height = bottom - top
    for index, tile in enumerate(tiles):
        sheet.paste(
            tile,
            ((index % columns) * tile_width, (index // columns) * tile_height),
        )
    sheet.save(OUTPUT / f"street-{key}-candidate-contact-sheet.png")
    print(key, "source skin components", skin_components(source))
    print(
        key,
        "background skin components",
        skin_components(background.crop(config["crop"])),
    )


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for key, config in CANDIDATES.items():
        build(key, config)


if __name__ == "__main__":
    main()
