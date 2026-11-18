"""Build a contact sheet for visually choosing a street-entry placement."""

import numpy as np
from PIL import Image, ImageDraw


ROOT = __import__("pathlib").Path(__file__).resolve().parent.parent
BACKGROUND = ROOT / "web" / "images" / "tianjin-street-scene-reference-v5.png"
SOURCE = ROOT / "web" / "images" / "street-entries" / "hei-tou-pair.png"

VARIANTS = [
    (915, 560, 0.300),
    (890, 550, 0.330),
    (940, 575, 0.280),
    (900, 575, 0.310),
]
REGIONS = {
    "candy": (350, 500, 720, 930),
    "baozi": (1060, 430, 1420, 930),
    "heitou": (850, 500, 1240, 920),
    "clay": (660, 340, 800, 550),
}
SOURCES = {
    "candy": "yu-liu-candy-carrier.png",
    "baozi": "gou-bu-li-bun-carrier.png",
    "heitou": "hei-tou-pair.png",
    "clay": "ni-ren-zhang-sign.png",
}


def mask_bbox(mask: np.ndarray) -> list[int] | None:
    ys, xs = np.where(mask)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]


def main() -> None:
    base = Image.open(BACKGROUND).convert("RGBA")
    source = Image.open(SOURCE).convert("RGBA")
    tiles = []
    for x, y, scale in VARIANTS:
        canvas = base.copy()
        figure = source.resize(
            (round(source.width * scale), round(source.height * scale)),
            Image.Resampling.LANCZOS,
        )
        canvas.alpha_composite(figure, (x, y))
        crop = canvas.crop((860, 500, 1240, 920))
        draw = ImageDraw.Draw(crop)
        draw.rectangle((0, 0, 250, 30), fill=(255, 255, 255))
        draw.text((8, 7), f"x={x} y={y} scale={scale:.3f}", fill=(0, 0, 0))
        tiles.append(crop)

    sheet = Image.new("RGB", (tiles[0].width * 2, tiles[0].height * 2), "white")
    for index, tile in enumerate(tiles):
        sheet.paste(tile.convert("RGB"), ((index % 2) * tile.width, (index // 2) * tile.height))
    sheet.save(ROOT / "output" / "street-heitou-placement-variants.png")

    background = np.asarray(base.convert("RGB"))
    for key, (left, top, right, bottom) in REGIONS.items():
        region = background[top:bottom, left:right]
        red = region[:, :, 0].astype(np.int16)
        green = region[:, :, 1].astype(np.int16)
        blue = region[:, :, 2].astype(np.int16)
        skin = (red > 135) & (red - green > 16) & (green > 65) & (blue < 205)
        print(key, "background skin", mask_bbox(skin))

        source = Image.open(
            ROOT / "web" / "images" / "street-entries" / SOURCES[key]
        ).convert("RGBA")
        source_rgba = np.asarray(source)
        source_red = source_rgba[:, :, 0].astype(np.int16)
        source_green = source_rgba[:, :, 1].astype(np.int16)
        source_blue = source_rgba[:, :, 2].astype(np.int16)
        source_skin = (
            (source_rgba[:, :, 3] > 80)
            & (source_red > 135)
            & (source_red - source_green > 16)
            & (source_green > 65)
            & (source_blue < 205)
        )
        print(key, "source skin", mask_bbox(source_skin))


if __name__ == "__main__":
    main()
