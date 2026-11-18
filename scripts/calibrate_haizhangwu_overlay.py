"""Find the background-relative transform for the transparent Sea Zhang Wu."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = (
    ROOT / "web" / "assets" / "ni-ren-zhang" / "sea-zhang-wu-enters-tianqingguan.png"
)
FIGURE = ROOT / "public" / "images" / "haizhangwu" / "front-walk.png"
OUTPUT = ROOT / "output" / "haizhangwu-overlay-calibration.json"
ANALYSIS_SCALE = 4


def resized_figure(source: Image.Image, scale: float) -> Image.Image:
    size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    return source.resize(size, Image.Resampling.LANCZOS)


def score(
    background: np.ndarray,
    source: Image.Image,
    scale: float,
    x: int,
    y: int,
) -> float:
    figure = resized_figure(source, scale)
    source_rgba = np.asarray(figure, dtype=np.float32)
    left = max(0, x)
    top = max(0, y)
    right = min(background.shape[1], x + figure.width)
    bottom = min(background.shape[0], y + figure.height)
    if right <= left or bottom <= top:
        return float("inf")

    source_left = left - x
    source_top = top - y
    patch = source_rgba[
        source_top : source_top + bottom - top,
        source_left : source_left + right - left,
    ]
    mask = patch[:, :, 3] >= 220
    if mask.sum() < 4_000:
        return float("inf")

    background_patch = background[top:bottom, left:right]
    color_delta = np.abs(patch[:, :, :3] - background_patch)
    luminance_delta = np.mean(color_delta, axis=2)

    lum_source = np.mean(patch[:, :, :3], axis=2)
    lum_background = np.mean(background_patch, axis=2)
    gradient_source_x = np.abs(np.diff(lum_source, axis=1, prepend=lum_source[:, :1]))
    gradient_source_y = np.abs(np.diff(lum_source, axis=0, prepend=lum_source[:1]))
    gradient_background_x = np.abs(
        np.diff(lum_background, axis=1, prepend=lum_background[:, :1])
    )
    gradient_background_y = np.abs(
        np.diff(lum_background, axis=0, prepend=lum_background[:1])
    )
    edge_mask = mask & (
        (gradient_source_x + gradient_source_y > 22)
        | (gradient_background_x + gradient_background_y > 22)
    )
    if edge_mask.sum() > 1000:
        edge_delta = float(np.mean(luminance_delta[edge_mask]))
    else:
        edge_delta = float(np.mean(luminance_delta[mask]))
    fill_delta = float(np.mean(luminance_delta[mask]))
    return edge_delta * 0.82 + fill_delta * 0.18


def search(
    background: np.ndarray,
    source: Image.Image,
    scales: np.ndarray,
    xs: range,
    ys: range,
) -> tuple[float, float, int, int, float]:
    best = (float("inf"), 0.0, 0, 0, float("inf"))
    for scale in scales:
        for x in xs:
            for y in ys:
                value = score(background, source, float(scale), x, y)
                if value < best[0]:
                    best = (value, float(scale), x, y, value)
    return best


def main() -> None:
    background = np.asarray(
        Image.open(BACKGROUND)
        .convert("RGB")
        .resize(
            (
                round(Image.open(BACKGROUND).width / ANALYSIS_SCALE),
                round(Image.open(BACKGROUND).height / ANALYSIS_SCALE),
            ),
            Image.Resampling.LANCZOS,
        ),
        dtype=np.float32,
    )
    source = Image.open(FIGURE).convert("RGBA")
    working_source = source.resize(
        (
            round(source.width / ANALYSIS_SCALE),
            round(source.height / ANALYSIS_SCALE),
        ),
        Image.Resampling.LANCZOS,
    )
    alpha_bounds = source.getchannel("A").getbbox()

    coarse = search(
        background,
        working_source,
        np.arange(0.515, 0.556, 0.005),
        range(94, 106),
        range(23, 35),
    )

    _, coarse_scale, coarse_x, coarse_y, _ = coarse
    fine = search(
        background,
        working_source,
        np.arange(coarse_scale - 0.004, coarse_scale + 0.0041, 0.001),
        range(coarse_x - 2, coarse_x + 3),
        range(coarse_y - 2, coarse_y + 3),
    )

    _, scale, x, y, best_score = fine
    x *= ANALYSIS_SCALE
    y *= ANALYSIS_SCALE
    figure = resized_figure(source, scale)
    result = {
        "background": str(BACKGROUND.relative_to(ROOT)).replace("\\", "/"),
        "figure": str(FIGURE.relative_to(ROOT)).replace("\\", "/"),
        "backgroundSize": {
            "width": Image.open(BACKGROUND).width,
            "height": Image.open(BACKGROUND).height,
        },
        "sourceSize": {"width": source.width, "height": source.height},
        "sourceAlphaBounds": {
            "left": alpha_bounds[0],
            "top": alpha_bounds[1],
            "right": alpha_bounds[2],
            "bottom": alpha_bounds[3],
        },
        "scale": round(scale, 6),
        "left": x,
        "top": y,
        "renderedSize": {"width": figure.width, "height": figure.height},
        "score": round(best_score, 6),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
