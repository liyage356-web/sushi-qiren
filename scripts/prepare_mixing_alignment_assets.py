from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "goubuli"
REFERENCE = Path(r"C:\Users\liyage\Pictures\水彩木桌上的空花纹陶碗.png")


def trim_transparent_asset(name: str) -> None:
    source = Image.open(ASSET_DIR / f"ingredient-{name}.webp").convert("RGBA")
    alpha = np.array(source.getchannel("A"))
    ys, xs = np.where(alpha >= 8)
    bounds = (
        int(xs.min()),
        int(ys.min()),
        int(xs.max()) + 1,
        int(ys.max()) + 1,
    )
    source.crop(bounds).save(
        ASSET_DIR / f"ingredient-{name}-position.webp",
        "WEBP",
        quality=96,
        method=6,
    )


def extract_chopsticks() -> None:
    source = Image.open(REFERENCE).convert("RGBA")
    crop_box = (1224, 434, 1510, 844)
    crop = source.crop(crop_box)

    # The reference contains two separate wooden chopsticks. Capped strokes
    # follow their real silhouettes while preserving the supplied illustration.
    mask = Image.new("L", crop.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.line((30, 16, 224, 398), fill=255, width=31)
    draw.line((73, 16, 270, 398), fill=255, width=31)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    crop.putalpha(mask)
    crop.save(
        ASSET_DIR / "chopsticks-mixing-position.webp",
        "WEBP",
        quality=96,
        method=6,
    )


for ingredient in ("meat", "scallion", "soup", "fat"):
    trim_transparent_asset(ingredient)

extract_chopsticks()
