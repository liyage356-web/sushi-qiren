"""Calibrate the three street overlays against their matching scene artwork."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
BACKGROUND_PATH = ROOT / "web" / "images" / "tianjin-street-scene-reference-v5.png"
ENTRY_DIR = ROOT / "web" / "images" / "street-entries"
OUTPUT_DIR = ROOT / "output"
REPORT_PATH = OUTPUT_DIR / "street-precise-alignment.json"

ENTRIES = {
    "heitou": {
        "file": "hei-tou-pair.png",
        "roi": (930, 470, 1220, 770),
        "scale": (0.240, 0.262, 0.0005),
        "x": (938, 954, 1.0),
        "y": (488, 504, 1.0),
    },
    "baozi": {
        "file": "gou-bu-li-bun-carrier.png",
        "roi": (1090, 500, 1410, 910),
        "scale": (0.260, 0.276, 0.0005),
        "x": (1102, 1118, 1.0),
        "y": (476, 492, 1.0),
    },
    "clay": {
        "file": "ni-ren-zhang-sign.png",
        "roi": (660, 340, 830, 520),
        "scale": (0.088, 0.096, 0.0002),
        "x": (676, 687, 0.5),
        "y": (368, 380, 0.5),
    },
}


def color_mask(rgba: np.ndarray, key: str) -> np.ndarray:
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    alpha = rgba[:, :, 3]
    if key == "clay":
        return (
            (alpha > 180)
            & (red > 100)
            & (green > 65)
            & (blue < 180)
            & (red - blue > 18)
        )
    if key == "baozi":
        return (
            (alpha > 180)
            & (red > 120)
            & (red - green > 6)
            & (green > 50)
            & (blue < 220)
        )
    return (
        (alpha > 180)
        & (green >= red - 2)
        & (green > blue + 3)
        & (red > 90)
        & (blue > 70)
    )


def candidates(bounds: tuple[float, float, float], decimals: int) -> list[float]:
    start, stop, step = bounds
    count = int(round((stop - start) / step)) + 1
    return [round(start + index * step, decimals) for index in range(count)]


def baseline_scale(source_mask: np.ndarray, target_mask: np.ndarray) -> float:
    source_y, source_x = np.nonzero(source_mask)
    target_y, target_x = np.nonzero(target_mask)
    source_width = source_x.max() - source_x.min() + 1
    source_height = source_y.max() - source_y.min() + 1
    target_width = target_x.max() - target_x.min() + 1
    target_height = target_y.max() - target_y.min() + 1
    return (target_width / source_width + target_height / source_height) / 2


def resize_mask(mask: np.ndarray, scale: float) -> tuple[np.ndarray, np.ndarray]:
    height, width = mask.shape
    rendered_height = max(1, round(height * scale))
    rendered_width = max(1, round(width * scale))
    image = Image.fromarray(mask.astype(np.uint8) * 255, mode="L").resize(
        (rendered_width, rendered_height),
        Image.Resampling.NEAREST,
    )
    ys, xs = np.nonzero(np.asarray(image) >= 128)
    return ys, xs


def fit_mask(
    source_mask: np.ndarray,
    target_mask: np.ndarray,
    config: dict,
) -> tuple[float, float, float, int, int]:
    target_area = int(target_mask.sum())
    estimate = baseline_scale(source_mask, target_mask)
    roi_left, roi_top = config["roi"][:2]
    print("initial mask scale estimate", round(estimate, 5))
    best = (float("inf"), float("inf"), 0.0, 0, 0)
    height, width = target_mask.shape

    for scale in candidates(config["scale"], 4):
        ys, xs = resize_mask(source_mask, scale)
        source_area = len(xs)
        for x in candidates(config["x"], 1):
            target_x = np.rint(xs + x - roi_left).astype(np.int32)
            if target_x.min() < 0 or target_x.max() >= width:
                continue
            for y in candidates(config["y"], 1):
                target_y = np.rint(ys + y - roi_top).astype(np.int32)
                if target_y.min() < 0 or target_y.max() >= height:
                    continue
                overlap = int(
                    np.count_nonzero(target_mask[target_y, target_x])
                )
                mismatch = source_area + target_area - 2 * overlap
                value = (
                    mismatch / max(source_area, target_area),
                    mismatch,
                )
                if value < best[:2]:
                    best = (value[0], value[1], round(scale, 5), x, y)

    return best[0], best[2], best[3], best[4], target_area


def refit_locally(
    source_mask: np.ndarray,
    target_mask: np.ndarray,
    scale: float,
    x: float,
    y: float,
    roi_left: float,
    roi_top: float,
) -> tuple[float, float, float, float]:
    target_area = int(target_mask.sum())
    height, width = target_mask.shape
    best = (float("inf"), scale, x, y)
    for candidate_scale in np.arange(scale - 0.001, scale + 0.0011, 0.0001):
        ys, xs = resize_mask(source_mask, float(candidate_scale))
        source_area = len(xs)
        for candidate_x in np.arange(x - 2, x + 2.1, 0.5):
            target_x = np.rint(xs + candidate_x - roi_left).astype(np.int32)
            if target_x.min() < 0 or target_x.max() >= width:
                continue
            for candidate_y in np.arange(y - 2, y + 2.1, 0.5):
                target_y = np.rint(ys + candidate_y - roi_top).astype(np.int32)
                if target_y.min() < 0 or target_y.max() >= height:
                    continue
                overlap = int(
                    np.count_nonzero(target_mask[target_y, target_x])
                )
                mismatch = (
                    source_area + target_area - 2 * overlap
                ) / max(source_area, target_area)
                if mismatch < best[0]:
                    best = (
                        mismatch,
                        round(float(candidate_scale), 5),
                        round(float(candidate_x), 2),
                        round(float(candidate_y), 2),
                    )
    return best


def composite(
    background: Image.Image,
    source_path: Path,
    x: float,
    y: float,
    scale: float,
    opacity: float,
) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    rendered = source.resize(
        (
            max(1, round(source.width * scale)),
            max(1, round(source.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    rendered.putalpha(
        rendered.getchannel("A").point(lambda value: round(value * opacity))
    )
    canvas = background.copy()
    canvas.alpha_composite(rendered, (round(x), round(y)))
    return canvas


def draw_grid(image: Image.Image, top_left: tuple[int, int]) -> Image.Image:
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 14)
    origin_x, origin_y = top_left
    for x in range(((origin_x + 19) // 20) * 20, image.width, 20):
        local_x = x - origin_x
        draw.line((local_x, 0, local_x, image.height), fill=(210, 65, 45), width=1)
        draw.text((local_x + 2, 2), str(x), fill=(170, 20, 20), font=font)
    for y in range(((origin_y + 19) // 20) * 20, image.height, 20):
        local_y = y - origin_y
        draw.line((0, local_y, image.width, local_y), fill=(45, 90, 210), width=1)
        draw.text((2, local_y + 1), str(y), fill=(20, 45, 170), font=font)
    return image


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    background = Image.open(BACKGROUND_PATH).convert("RGBA")
    background_array = np.asarray(background)
    results: dict[str, dict] = {}

    for key, config in ENTRIES.items():
        source_path = ENTRY_DIR / config["file"]
        source = Image.open(source_path).convert("RGBA")
        source_array = np.asarray(source)
        source_mask = color_mask(source_array, key)
        left, top, right, bottom = config["roi"]
        target_mask = color_mask(
            background_array[top:bottom, left:right],
            key,
        )

        _, scale, x, y, target_area = fit_mask(
            source_mask,
            target_mask,
            config,
        )
        mismatch, scale, x, y = refit_locally(
            source_mask,
            target_mask,
            scale,
            x,
            y,
            config["roi"][0],
            config["roi"][1],
        )
        result = {
            "file": f"images/street-entries/{config['file']}",
            "sourceSize": [source.width, source.height],
            "alphaBounds": list(source.getchannel("A").getbbox() or ()),
            "x": x,
            "y": y,
            "scale": scale,
            "colorMaskMismatch": round(mismatch, 6),
            "targetColorPixels": target_area,
        }
        results[key] = result
        print(key, json.dumps(result, ensure_ascii=False))

    crop_regions = {
        "heitou": (900, 440, 1235, 790),
        "baozi": (1080, 470, 1430, 925),
        "clay": (640, 320, 850, 560),
    }
    for key, result in results.items():
        preview = composite(
            background,
            ROOT / "web" / result["file"],
            result["x"],
            result["y"],
            result["scale"],
            0.5,
        )
        box = crop_regions[key]
        crop = preview.crop(box).resize(
            ((box[2] - box[0]) * 2, (box[3] - box[1]) * 2),
            Image.Resampling.LANCZOS,
        )
        crop = crop.convert("RGB")
        draw_grid(crop.convert("RGBA"), box[:2]).convert("RGB").save(
            OUTPUT_DIR / f"street-precise-{key}-calibrated-50.png"
        )

    REPORT_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"report": str(REPORT_PATH)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
