from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps


SOURCE = Path(r"C:\Users\liyage\Pictures\天津卫老街长卷_码头版C_1920x816.png")
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"


def _to_float(image: Image.Image) -> np.ndarray:
    return np.asarray(image, dtype=np.float32) / 255.0


def _to_image(array: np.ndarray) -> Image.Image:
    return Image.fromarray(
        np.clip(array * 255.0, 0.0, 255.0).round().astype(np.uint8)
    )


def blur(array: np.ndarray, radius: float) -> np.ndarray:
    return _to_float(_to_image(array).filter(ImageFilter.GaussianBlur(radius)))


def median(array: np.ndarray, size: int) -> np.ndarray:
    return _to_float(_to_image(array).filter(ImageFilter.MedianFilter(size)))


def soft_threshold(value: np.ndarray, threshold: float, softness: float) -> np.ndarray:
    return np.clip(
        (value - threshold) / max(softness, 1.0e-6) + 0.5,
        0.0,
        1.0,
    )


def non_maximum_suppression(magnitude: np.ndarray, gx: np.ndarray, gy: np.ndarray) -> np.ndarray:
    """Keep one response across each edge instead of letting it become a black band."""
    angle = (np.rad2deg(np.arctan2(gy, gx)) + 180.0) % 180.0
    padded = np.pad(magnitude, 1, mode="edge")
    center = padded[1:-1, 1:-1]

    left = padded[1:-1, :-2]
    right = padded[1:-1, 2:]
    above = padded[:-2, 1:-1]
    below = padded[2:, 1:-1]
    upper_left = padded[:-2, :-2]
    lower_right = padded[2:, 2:]
    upper_right = padded[:-2, 2:]
    lower_left = padded[2:, :-2]

    horizontal = (angle < 22.5) | (angle >= 157.5)
    vertical = (angle >= 67.5) & (angle < 112.5)
    diagonal_down = (angle >= 22.5) & (angle < 67.5)
    diagonal_up = (angle >= 112.5) & (angle < 157.5)

    keep = np.zeros_like(center, dtype=bool)
    keep |= horizontal & (center >= left) & (center >= right)
    keep |= vertical & (center >= above) & (center >= below)
    keep |= diagonal_down & (center >= upper_left) & (center >= lower_right)
    keep |= diagonal_up & (center >= upper_right) & (center >= lower_left)
    return np.where(keep, center, 0.0)


def wobble_linework(
    ink: np.ndarray,
    strength: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Introduce a restrained hand tremor without shifting the whole drawing."""
    height, width = ink.shape
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    dx = strength * (
        0.62 * np.sin(y * 0.029 + 0.7)
        + 0.24 * np.sin(y * 0.071 - x * 0.008)
        + 0.14 * np.sin(x * 0.043 + y * 0.017)
    )
    dy = strength * (
        0.62 * np.sin(x * 0.026 + 1.9)
        + 0.24 * np.sin(x * 0.058 + y * 0.006)
        + 0.14 * np.sin(y * 0.047 - x * 0.011)
    )
    dx += rng.normal(0.0, strength * 0.08, (height, width)).astype(np.float32)
    dy += rng.normal(0.0, strength * 0.08, (height, width)).astype(np.float32)
    sx = np.clip(x + dx, 0.0, width - 1.0).astype(np.int32)
    sy = np.clip(y + dy, 0.0, height - 1.0).astype(np.int32)
    return ink[sy, sx]


def remove_isolated_specks(ink: np.ndarray) -> np.ndarray:
    """Clear lone pixel-sized noise while preserving connected drawn marks."""
    padded = np.pad(ink, 1, mode="edge")
    support = np.zeros_like(ink, dtype=np.float32)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            if dx == 1 and dy == 1:
                continue
            support += padded[dy : dy + ink.shape[0], dx : dx + ink.shape[1]]
    keep = soft_threshold(support / 0.22, 0.72, 0.25)
    return ink * keep


def paper_field(width: int, height: int, rng: np.random.Generator) -> np.ndarray:
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    noise = rng.normal(0.0, 1.0, (height, width)).astype(np.float32)
    noise = blur(np.clip(noise * 0.08 + 0.5, 0.0, 1.0), 0.7)

    grain = 0.988 + 0.008 * noise
    grain += 0.0022 * np.sin(x * 0.083 + y * 0.014)
    grain += 0.0012 * np.sin(x * 0.026 - y * 0.071)
    grain += 0.0008 * np.sin(x * 0.157 + y * 0.039)

    edge = (
        np.abs(x - width * 0.5) / (width * 0.5)
        + np.abs(y - height * 0.5) / (height * 0.5)
    )
    grain -= np.clip(edge * 0.004, 0.0, 0.008)
    return grain


def relaxed_hatch(
    local_tone: np.ndarray,
    rng: np.random.Generator,
    strength: float,
) -> np.ndarray:
    """Add sparse, broken hatching only inside the darkest source masses."""
    height, width = local_tone.shape
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    darkness = soft_threshold(0.43 - local_tone, 0.0, 0.22)

    phase = x * 0.44 + y * 0.23 + 1.7 * np.sin(y * 0.027)
    stroke = soft_threshold(np.cos(phase), 0.78, 0.16)

    breakup = rng.normal(0.0, 1.0, (height, width)).astype(np.float32)
    breakup = blur(np.clip(breakup * 0.16 + 0.5, 0.0, 1.0), 0.55)
    breakup = soft_threshold(breakup, 0.35, 0.20)
    return np.clip(stroke * darkness * breakup * strength, 0.0, 1.0)


def make_light_ink_variant(
    source: Image.Image,
    *,
    line_threshold: float,
    contrast_weight: float,
    edge_weight: float,
    hatch_strength: float,
    ink_strength: float,
    ink_cutoff: float,
    ink_softness: float,
    paper_tone: int,
    seed: int,
) -> Image.Image:
    rng = np.random.default_rng(seed)
    gray = _to_float(ImageOps.grayscale(source))

    # Remove photographic micro-texture, but retain the broad shapes of the
    # people, boats, roofs, signs, and paving.
    clean = median(gray, 3)
    clean = blur(clean, 1.55)

    # Local contrast turns thin dark strokes into ink while large black masses
    # become mostly white: the interior has little contrast with its own blur.
    local_tone = blur(clean, 5.0)
    local_dark = soft_threshold(local_tone - clean, line_threshold, 0.035)
    local_dark = np.power(local_dark, 0.83) * contrast_weight

    # Major contours are extracted separately and thinned by non-maximum
    # suppression, so walls and clothes read as outline drawings.
    contour_input = blur(clean, 1.90)
    gy, gx = np.gradient(contour_input)
    magnitude = np.hypot(gx, gy)
    magnitude = non_maximum_suppression(magnitude, gx, gy)

    # Normalize contour strength gently by local brightness. This keeps the
    # signs legible without restoring the black fills.
    norm = np.maximum(local_tone, 0.33)
    edge = soft_threshold(magnitude / norm, 0.27, 0.16)
    edge = np.power(edge, 0.72) * edge_weight

    hatch = relaxed_hatch(local_tone, rng, hatch_strength)
    ink = np.maximum.reduce((local_dark, edge, hatch))

    # Keep ink as tightly separated black strokes rather than a translucent
    # gray tracing of every photographic detail.
    ink = np.clip((ink - ink_cutoff) / max(ink_softness, 1.0e-6) + 0.5, 0.0, 1.0)
    ink = np.power(ink, 1.35)
    ink = wobble_linework(ink, strength=0.62, rng=rng)
    ink = remove_isolated_specks(ink)

    # Dry-brush variation: a few tiny interruptions make the marks less
    # mechanically traced. The modulation is low-frequency and never fills a
    # region with gray.
    dry = rng.normal(0.0, 1.0, gray.shape).astype(np.float32)
    dry = blur(np.clip(dry * 0.11 + 0.5, 0.0, 1.0), 1.1)
    ink *= 0.80 + 0.20 * dry
    ink = np.clip(ink, 0.0, 1.0)
    ink = blur(ink, 0.22)

    ink_rgb = np.array([0.040, 0.039, 0.036], dtype=np.float32)
    paper_value = paper_tone / 255.0
    paper = paper_field(source.width, source.height, rng) * paper_value

    alpha = np.clip(ink * ink_strength, 0.0, 1.0)[..., None]
    result = paper[..., None] * (1.0 - alpha) + ink_rgb * alpha
    return _to_image(np.clip(result, 0.0, 1.0))


def build_comparison(images: list[tuple[str, Image.Image]], path: Path) -> None:
    margin = 30
    gap = 22
    label_height = 34
    width = images[0][1].width
    height = images[0][1].height
    sheet = Image.new(
        "RGB",
        (width + margin * 2, margin * 2 + len(images) * (height + label_height + gap) - gap),
        (228, 224, 214),
    )

    from PIL import ImageDraw, ImageFont

    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 20)
    except OSError:
        font = ImageFont.load_default()

    draw = ImageDraw.Draw(sheet)
    y = margin
    for label, image in images:
        draw.text((margin, y), label, fill=(35, 34, 31), font=font)
        sheet.paste(image.convert("RGB"), (margin, y + label_height))
        y += height + label_height + gap

    sheet.save(path, quality=94, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")

    variants = [
        (
            "浅墨疏笔",
            "天津卫老街_冯骥才风格_浅墨疏笔_1920x816.png",
            dict(
                line_threshold=0.026,
                contrast_weight=0.44,
                edge_weight=0.84,
                hatch_strength=0.020,
                ink_strength=0.95,
                ink_cutoff=0.33,
                ink_softness=0.045,
                paper_tone=244,
                seed=1897,
            ),
        ),
        (
            "简练留白",
            "天津卫老街_冯骥才风格_简练留白_1920x816.png",
            dict(
                line_threshold=0.026,
                contrast_weight=0.36,
                edge_weight=0.74,
                hatch_strength=0.000,
                ink_strength=0.94,
                ink_cutoff=0.31,
                ink_softness=0.050,
                paper_tone=246,
                seed=1900,
            ),
        ),
        (
            "墨线稍重",
            "天津卫老街_冯骥才风格_墨线稍重_1920x816.png",
            dict(
                line_threshold=0.022,
                contrast_weight=0.51,
                edge_weight=0.88,
                hatch_strength=0.045,
                ink_strength=1.00,
                ink_cutoff=0.31,
                ink_softness=0.050,
                paper_tone=243,
                seed=1912,
            ),
        ),
    ]

    rendered: list[tuple[str, Image.Image]] = []
    for label, filename, params in variants:
        image = make_light_ink_variant(source, **params)
        image.save(OUTPUT_DIR / filename, optimize=True)
        rendered.append((label, image))

    build_comparison(rendered, OUTPUT_DIR / "冯骥才风格_三档留白对照.png")


if __name__ == "__main__":
    main()
