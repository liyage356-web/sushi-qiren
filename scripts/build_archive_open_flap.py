"""Reshape the supplied open-flap artwork without rebuilding its texture.

The source flap is the only high-resolution material that contains the existing
paper grain and dark fold line. This script keeps that artwork intact and
replaces only its alpha silhouette so the opened state can use the narrower
top, gently flared sides and slight lower-edge curve shown in the reference.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web" / "assets" / "archive" / "archive-flap-open.png"
OUTPUT = ROOT / "web" / "assets" / "archive" / "archive-flap-open-clean.png"

WIDTH = 1656
HEIGHT = 480
SUPERSAMPLE = 3


def cubic_point(
    start: tuple[float, float],
    control_a: tuple[float, float],
    control_b: tuple[float, float],
    end: tuple[float, float],
    steps: int = 72,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        inverse = 1 - t
        x = (
            inverse**3 * start[0]
            + 3 * inverse**2 * t * control_a[0]
            + 3 * inverse * t**2 * control_b[0]
            + t**3 * end[0]
        )
        y = (
            inverse**3 * start[1]
            + 3 * inverse**2 * t * control_a[1]
            + 3 * inverse * t**2 * control_b[1]
            + t**3 * end[1]
        )
        points.append((x, y))
    return points


def silhouette() -> Image.Image:
    scale = SUPERSAMPLE
    mask = Image.new("L", (WIDTH * scale, HEIGHT * scale), 0)
    draw = ImageDraw.Draw(mask)

    top_left = (93.0, 12.0)
    top_right = (WIDTH - 93.0, 12.0)
    bottom_right = (WIDTH, HEIGHT - 18.0)
    bottom_left = (0.0, HEIGHT - 18.0)

    points: list[tuple[float, float]] = []
    points.extend(
        cubic_point(
            top_left,
            (124.0, 2.0),
            (WIDTH - 124.0, 2.0),
            top_right,
        )
    )
    points.extend(
        cubic_point(
            top_right,
            (WIDTH - 52.0, 138.0),
            (WIDTH - 15.0, 370.0),
            bottom_right,
        )
    )
    points.extend(
        cubic_point(
            bottom_right,
            (WIDTH * 0.79, HEIGHT - 6.0),
            (WIDTH * 0.21, HEIGHT - 6.0),
            bottom_left,
        )
    )
    points.extend(
        cubic_point(
            bottom_left,
            (15.0, 370.0),
            (52.0, 138.0),
            top_left,
        )
    )

    draw.polygon(
        [(round(x * scale), round(y * scale)) for x, y in points],
        fill=255,
    )
    return mask.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def crease_mask() -> Image.Image:
    scale = SUPERSAMPLE
    mask = Image.new("L", (WIDTH * scale, HEIGHT * scale), 0)
    draw = ImageDraw.Draw(mask)
    upper: list[tuple[float, float]] = []
    lower: list[tuple[float, float]] = []

    for index in range(WIDTH + 1):
        x = float(index)
        amount = math.sin(math.pi * index / WIDTH)
        center_y = HEIGHT - 44.0 + amount * 8.0
        thickness = 27.0 + amount * 15.0
        upper.append((x, center_y - thickness / 2))
        lower.append((x, center_y + thickness / 2))

    points = upper + list(reversed(lower))
    draw.polygon(
        [(round(x * scale), round(y * scale)) for x, y in points],
        fill=255,
    )
    return mask.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def add_natural_fold(result: Image.Image) -> Image.Image:
    """Bake a warm, slightly bowed crease over the clean paper texture."""

    shadow = Image.new("RGBA", result.size, (73, 51, 30, 0))
    shadow.putalpha(crease_mask().point(lambda value: round(value * 0.18)))
    result = Image.alpha_composite(result, shadow)

    crease = Image.new("RGBA", result.size, (106, 80, 49, 0))
    crease.putalpha(crease_mask().point(lambda value: round(value * 0.92)))
    result = Image.alpha_composite(result, crease)

    lip = Image.new("RGBA", result.size, (222, 190, 126, 0))
    lip_alpha = Image.new("L", result.size, 0)
    draw = ImageDraw.Draw(lip_alpha)
    for index in range(WIDTH):
        amount = math.sin(math.pi * index / WIDTH)
        center_y = HEIGHT - 44.0 + amount * 8.0
        thickness = 27.0 + amount * 15.0
        draw.line(
            [(index, round(center_y + thickness / 2)),
             (index, round(center_y + thickness / 2 + 3))],
            fill=round(42 * amount),
        )
    lip.putalpha(lip_alpha)
    return Image.alpha_composite(result, lip)


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    # The original export contains a stepped pale strip and a clipped dark line
    # at its lower edge. Reuse only the clean upper paper field; the supplied
    # grain remains intact while the replacement crease is added below.
    paper = source.crop((16, 0, source.width - 16, 94))
    resized = paper.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

    # Keep the source's paper grain and RGB character. Only alpha and the
    # previously clipped lower-edge crease are rebuilt.
    alpha = resized.getchannel("A")
    alpha = Image.composite(
        alpha,
        Image.new("L", alpha.size, 0),
        silhouette(),
    )
    result = resized.copy()
    result.putalpha(alpha)
    result = add_natural_fold(result)
    result.save(OUTPUT, optimize=True)


if __name__ == "__main__":
    main()
