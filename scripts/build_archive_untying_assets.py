"""Build clean static layers for the archive's animated cord sequence.

The closed-flap artwork is the visual source for the paper grain and both
fasteners. This script removes only the baked cord region, then extracts two
standalone fastener buttons. The live SVG cord is drawn over these layers at
runtime so its loops can be interpolated frame by frame.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "web" / "assets" / "archive"
FLAP_SOURCE = ASSET_DIR / "archive-flap-closed.png"
LOWER_SOURCE = ASSET_DIR / "archive-loose-cord.png"
FLAP_OUTPUT = ASSET_DIR / "archive-flap-closed-clean.png"
UPPER_OUTPUT = ASSET_DIR / "archive-fastener-upper.png"
LOWER_OUTPUT = ASSET_DIR / "archive-fastener-lower.png"

# The patch fully contains the baked upper cord and is feathered into the
# surrounding export so the flap's original paper field remains continuous.
PATCH = (688, 162, 958, 500)
PATCH_FEATHER = 22


def horizontal_paper_fill(source: Image.Image) -> Image.Image:
    """Clone a clean paper field and colour-match it to the centre gradient."""

    pixels = np.asarray(source).astype(np.float32)
    height, width = pixels.shape[:2]
    x1, y1, x2, y2 = PATCH
    fill = np.zeros_like(pixels)
    fill[:, :, 3] = 0

    donor_width = x2 - x1
    donor = source.crop((420, y1, 420 + donor_width, y2)).convert("RGBA")
    donor_pixels = np.asarray(donor).astype(np.float32)

    for row, y in enumerate(range(y1, y2)):
        left = pixels[y, x1 - 18]
        right = pixels[y, x2 + 18]
        target_mean = (left[:3] + right[:3]) / 2
        donor_alpha = donor_pixels[row, :, 3]
        visible = donor_alpha > 8
        if visible.any():
            donor_mean = donor_pixels[row, visible, :3].mean(axis=0)
            donor_pixels[row, visible, :3] += target_mean - donor_mean
        fill[y, x1:x2] = donor_pixels[row]

    return Image.fromarray(
        np.clip(fill, 0, 255).astype(np.uint8), "RGBA"
    )


def feathered_patch_mask(size: tuple[int, int]) -> Image.Image:
    width, height = size
    x1, y1, x2, y2 = PATCH
    mask = np.zeros((height, width), dtype=np.float32)
    horizontal = np.ones(x2 - x1, dtype=np.float32)
    feather = PATCH_FEATHER
    horizontal[:feather] = np.linspace(0.0, 1.0, feather) ** 2
    horizontal[-feather:] = np.linspace(1.0, 0.0, feather) ** 2
    for y in range(y1, y2):
        vertical = 1.0
        if y < y1 + feather:
            vertical = ((y - y1 + 0.5) / feather) ** 2
        mask[y, x1:x2] = horizontal * vertical
    return Image.fromarray((mask * 255).astype(np.uint8), "L")


def build_clean_flap() -> None:
    source = Image.open(FLAP_SOURCE).convert("RGBA")
    fill = horizontal_paper_fill(source)
    mask = feathered_patch_mask(source.size)
    result = Image.composite(fill, source, mask)
    result.save(FLAP_OUTPUT, optimize=True)


def ellipse_alpha(size: int, radius: float) -> Image.Image:
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    draw = ImageDraw.Draw(mask)
    centre = size * scale / 2
    edge = radius * scale
    draw.ellipse(
        (centre - edge, centre - edge, centre + edge, centre + edge),
        fill=255,
    )
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def build_fastener(size: int = 200) -> Image.Image:
    """Render a clean dark paper fastener with the original's concentric eyelet."""

    scale = 4
    canvas_size = size * scale
    centre = canvas_size / 2
    yy, xx = np.ogrid[:canvas_size, :canvas_size]
    distance = np.hypot(xx - centre, yy - centre)
    radius = 82 * scale

    # Warm cast shadow and neutral pressed-paper disk.
    rgba = np.zeros((canvas_size, canvas_size, 4), dtype=np.uint8)
    shadow_distance = np.hypot(xx - centre - 2 * scale, yy - centre - 5 * scale)
    shadow_mask = np.clip((radius + 10 * scale - shadow_distance) / (3 * scale), 0, 1)
    rgba[:, :, 0] = 52
    rgba[:, :, 1] = 42
    rgba[:, :, 2] = 28
    rgba[:, :, 3] = (shadow_mask * 72).astype(np.uint8)

    disk_alpha = np.clip((radius - distance) / (1.4 * scale), 0, 1)
    disk_alpha[disk_alpha > 0] = np.minimum(1.0, disk_alpha[disk_alpha > 0] * 4)
    tonal = np.clip((distance / radius - 0.2) / 0.8, 0, 1)
    disk_rgb = np.empty((canvas_size, canvas_size, 3), dtype=np.float32)
    disk_rgb[..., 0] = 59 - tonal * 10
    disk_rgb[..., 1] = 57 - tonal * 10
    disk_rgb[..., 2] = 49 - tonal * 8

    rng = np.random.default_rng(20261111)
    grain = rng.normal(0, 2.2, (canvas_size, canvas_size))
    grain = np.asarray(
        Image.fromarray(np.uint8(np.clip(grain + 128, 0, 255))).filter(
            ImageFilter.GaussianBlur(0.35 * scale)
        ),
        dtype=np.float32,
    ) - 128
    disk_rgb += grain[..., None] * np.array([1.0, 0.92, 0.75])

    # Soft inner ring from the source button.
    inner_ring = np.exp(-((distance - 66 * scale) / (1.5 * scale)) ** 2)
    disk_rgb += inner_ring[..., None] * np.array([24, 22, 17])
    disk_rgb = np.clip(disk_rgb, 0, 255)
    rgba[..., :3] = np.where(
        disk_alpha[..., None] > 0,
        disk_rgb,
        rgba[..., :3],
    )
    rgba[..., 3] = np.maximum(
        rgba[..., 3],
        (disk_alpha * 255).astype(np.uint8),
    )

    result = Image.fromarray(rgba, "RGBA").resize(
        (size, size), Image.Resampling.LANCZOS
    )
    draw = ImageDraw.Draw(result)
    centre_scaled = size / 2
    for outer, inner, colour in (
        (35, 25, (191, 157, 97, 255)),
        (27, 16, (244, 239, 220, 255)),
        (19, 0, (155, 120, 67, 255)),
    ):
        draw.ellipse(
            (
                centre_scaled - outer,
                centre_scaled - outer,
                centre_scaled + outer,
                centre_scaled + outer,
            ),
            fill=colour,
        )
        if inner:
            draw.ellipse(
                (
                    centre_scaled - inner,
                    centre_scaled - inner,
                    centre_scaled + inner,
                    centre_scaled + inner,
                ),
                fill=(191, 157, 97, 255)
                if outer == 35
                else (155, 120, 67, 255),
            )
    draw.ellipse(
        (
            centre_scaled - 10,
            centre_scaled - 10,
            centre_scaled + 10,
            centre_scaled + 10,
        ),
        fill=(42, 37, 29, 255),
    )
    draw.arc(
        (
            centre_scaled - 32,
            centre_scaled - 32,
            centre_scaled + 32,
            centre_scaled + 32,
        ),
        205,
        330,
        fill=(223, 194, 137, 150),
        width=1,
    )
    # Clip the button and its cast shadow to one clean silhouette.
    result.putalpha(ellipse_alpha(size, 97))
    return result


def build_fasteners() -> None:
    upper = build_fastener()
    upper.save(UPPER_OUTPUT, optimize=True)
    lower = build_fastener()
    lower.save(LOWER_OUTPUT, optimize=True)


def main() -> None:
    build_clean_flap()
    build_fasteners()
    print(FLAP_OUTPUT)
    print(UPPER_OUTPUT)
    print(LOWER_OUTPUT)


if __name__ == "__main__":
    main()
