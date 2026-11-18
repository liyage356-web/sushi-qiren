from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps


SOURCE = Path(r"C:\Users\liyage\Pictures\天津卫老街长卷_码头版C_1920x816.png")
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"


def gaussian_blur(array: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.clip(array * 255.0, 0, 255).astype(np.uint8))
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def median_blur(array: np.ndarray, size: int) -> np.ndarray:
    image = Image.fromarray(np.clip(array * 255.0, 0, 255).astype(np.uint8))
    return np.asarray(image.filter(ImageFilter.MedianFilter(size)), dtype=np.float32) / 255.0


def box_blur(array: np.ndarray, radius: int) -> np.ndarray:
    image = Image.fromarray(np.clip(array * 255.0, 0, 255).astype(np.uint8))
    return np.asarray(image.filter(ImageFilter.BoxBlur(radius)), dtype=np.float32) / 255.0


def soft_threshold(value: np.ndarray, threshold: float, softness: float) -> np.ndarray:
    return np.clip((value - threshold) / max(softness, 1e-6) + 0.5, 0.0, 1.0)


def remove_flecks(image: Image.Image, size: int = 1) -> Image.Image:
    """Close isolated tonal specks while retaining the strong hand-drawn strokes."""
    if size <= 0:
        return image
    return image.filter(ImageFilter.MedianFilter(2 * size + 1))


def paper_texture(width: int, height: int, rng: np.random.Generator) -> np.ndarray:
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)

    fine_noise = rng.normal(0.0, 1.0, (height, width)).astype(np.float32)
    fine_image = Image.fromarray(
        np.clip(fine_noise * 34.0 + 128.0, 0, 255).astype(np.uint8)
    )
    fine_noise = np.asarray(
        fine_image.filter(ImageFilter.GaussianBlur(0.45)), dtype=np.float32
    ) / 255.0
    fine_noise = (fine_noise - fine_noise.mean()) * 0.018

    fibers = (
        0.0055 * np.sin(0.083 * x + 0.013 * y)
        + 0.0032 * np.sin(0.031 * x - 0.068 * y)
        + 0.0026 * np.sin(0.142 * x + 0.021 * y)
    )

    vignette = (
        ((x - width / 2) / (width / 2)) ** 2
        + ((y - height / 2) / (height / 2)) ** 2
    )
    vignette = np.clip(vignette * 0.008, 0.0, 0.018)
    return fine_noise + fibers - vignette


def wobble_gray(gray: np.ndarray, strength: float, rng: np.random.Generator) -> np.ndarray:
    """A tiny hand-tremor warp keeps lines from looking mechanically traced."""
    height, width = gray.shape
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)

    dx = (
        strength
        * (
            0.65 * np.sin(y * 0.034 + 0.8)
            + 0.35 * np.sin(y * 0.073 - x * 0.006 + 1.4)
        )
    )
    dy = (
        strength
        * 0.55
        * (
            0.7 * np.sin(x * 0.029 + 2.0)
            + 0.3 * np.sin(x * 0.061 + y * 0.004)
        )
    )
    dx += rng.normal(0.0, strength * 0.12, (height, width)).astype(np.float32)
    dy += rng.normal(0.0, strength * 0.12, (height, width)).astype(np.float32)

    sx = np.clip(x + dx, 0, width - 1).astype(np.int32)
    sy = np.clip(y + dy, 0, height - 1).astype(np.int32)
    return gray[sy, sx]


def make_ink_sketch(
    source: Image.Image,
    *,
    simplify_radius: float,
    edge_radius: float,
    edge_threshold: float,
    edge_gain: float,
    tone_center: float,
    tone_softness: float,
    tone_gain: float,
    edge_weight: float,
    paper_tone: int,
    line_blur: float,
    seed: int,
) -> Image.Image:
    rng = np.random.default_rng(seed)
    gray = np.asarray(ImageOps.grayscale(source), dtype=np.float32) / 255.0

    # The reference figures use broad, relaxed marks. Suppress photographic
    # micro-detail first, then recover the major contours with an XDoG-style edge.
    simplified = gaussian_blur(gray, simplify_radius)
    simplified = median_blur(simplified, 3)
    edge_smooth = gaussian_blur(simplified, edge_radius)
    detail = np.abs(edge_smooth - simplified)
    edge = soft_threshold(detail, edge_threshold, 0.024)
    edge = np.clip(edge * edge_gain, 0.0, 1.0)

    # Preserve the readable source strokes while compressing most pale gray
    # shading toward the paper. This keeps shop signs and boat rigging intact.
    tone = soft_threshold(tone_center - simplified, 0.0, tone_softness)
    tone = np.clip(tone**tone_gain, 0.0, 1.0)

    ink = np.maximum(tone, edge * edge_weight)
    ink = wobble_gray(ink, strength=0.88, rng=rng)

    image = Image.fromarray(np.clip(ink * 255.0, 0, 255).astype(np.uint8))
    image = remove_flecks(image, 1)
    image = image.filter(ImageFilter.GaussianBlur(line_blur))

    result = np.asarray(image, dtype=np.float32) / 255.0
    paper = paper_tone / 255.0
    result = paper * (1.0 - result)
    result += paper_texture(source.width, source.height, rng)
    result = np.clip(result, 0.0, 1.0)
    return Image.fromarray((result * 255).round().astype(np.uint8))


def build_contact_sheet(images: list[tuple[str, Image.Image]], path: Path) -> None:
    gap = 28
    margin = 32
    label_height = 38
    width = images[0][1].width
    height = images[0][1].height
    sheet_width = margin * 2 + width
    sheet_height = margin * 2 + len(images) * (height + label_height + gap) - gap
    sheet = Image.new("RGB", (sheet_width, sheet_height), (223, 218, 207))

    try:
        from PIL import ImageDraw, ImageFont

        font = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 21)
    except Exception:
        font = None

    y = margin
    for label, image in images:
        sheet.paste(image.convert("RGB"), (margin, y + label_height))
        if font is not None:
            draw = ImageDraw.Draw(sheet)
            draw.text((margin, y), label, fill=(35, 34, 31), font=font)
        y += height + label_height + gap

    sheet.save(path, quality=94, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")

    variants = [
        (
            "01_墨线写意",
            "天津卫老街_墨线写意_1920x816.png",
            dict(
                simplify_radius=1.15,
                edge_radius=1.8,
                edge_threshold=0.065,
                edge_gain=1.55,
                tone_center=0.57,
                tone_softness=0.13,
                tone_gain=1.12,
                edge_weight=0.68,
                paper_tone=235,
                line_blur=0.22,
                seed=1836,
            ),
        ),
        (
            "02_松弛水墨速写",
            "天津卫老街_松弛速写_1920x816.png",
            dict(
                simplify_radius=1.85,
                edge_radius=2.55,
                edge_threshold=0.082,
                edge_gain=1.7,
                tone_center=0.54,
                tone_softness=0.11,
                tone_gain=1.2,
                edge_weight=0.62,
                paper_tone=229,
                line_blur=0.32,
                seed=2015,
            ),
        ),
        (
            "03_简笔版画",
            "天津卫老街_简笔版画_1920x816.png",
            dict(
                simplify_radius=2.65,
                edge_radius=3.25,
                edge_threshold=0.095,
                edge_gain=1.9,
                tone_center=0.5,
                tone_softness=0.09,
                tone_gain=1.3,
                edge_weight=0.58,
                paper_tone=236,
                line_blur=0.18,
                seed=1920,
            ),
        ),
    ]

    rendered: list[tuple[str, Image.Image]] = []
    for label, filename, params in variants:
        image = make_ink_sketch(source, **params)
        image.save(OUTPUT_DIR / filename, optimize=True)
        rendered.append((label, image))

    build_contact_sheet(rendered, OUTPUT_DIR / "三版风格对照.png")


if __name__ == "__main__":
    main()
