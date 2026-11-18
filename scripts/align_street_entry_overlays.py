"""Align the four supplied street-entry PNGs to the existing street artwork."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = ROOT / "web" / "images" / "tianjin-street-scene-reference-v5.png"
ENTRY_DIR = ROOT / "web" / "images" / "street-entries"
OUTPUT = ROOT / "output" / "street-entry-alignment.json"
PREVIEW = ROOT / "output" / "street-entry-alignment-50.png"
WORK_SCALE = 3

ENTRIES = {
    "candy": {
        "file": "yu-liu-candy-carrier.png",
        "scales": np.arange(0.225, 0.251, 0.004),
        "x": range(370, 431),
        "y": range(548, 601),
    },
    "baozi": {
        "file": "gou-bu-li-bun-carrier.png",
        "scales": np.arange(0.285, 0.322, 0.004),
        "x": range(1060, 1131),
        "y": range(405, 471),
    },
    "heitou": {
        "file": "hei-tou-pair.png",
        "scales": np.arange(0.265, 0.321, 0.004),
        "x": range(920, 981),
        "y": range(555, 616),
    },
    "clay": {
        "file": "ni-ren-zhang-sign.png",
        "scales": np.arange(0.058, 0.0851, 0.002),
        "x": range(690, 731),
        "y": range(365, 416),
    },
}


def scaled_figure(source: Image.Image, scale: float) -> Image.Image:
    return source.resize(
        (
            max(1, round(source.width * scale)),
            max(1, round(source.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )


def convex_hull(points: np.ndarray) -> list[list[int]]:
    ordered = sorted({(int(x), int(y)) for x, y in points})
    if len(ordered) <= 2:
        return [list(point) for point in ordered]

    def cross(origin: tuple[int, int], a: tuple[int, int], b: tuple[int, int]) -> int:
        return (a[0] - origin[0]) * (b[1] - origin[1]) - (
            a[1] - origin[1]
        ) * (b[0] - origin[0])

    lower: list[tuple[int, int]] = []
    for point in ordered:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)

    upper: list[tuple[int, int]] = []
    for point in reversed(ordered):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)

    return [list(point) for point in lower[:-1] + upper[:-1]]


def hit_polygon(source: Image.Image) -> list[list[int]]:
    alpha = np.asarray(source.getchannel("A"))
    ys, xs = np.where(alpha >= 64)
    step = max(1, int(np.sqrt(len(xs) / 3000)))
    points = np.column_stack((xs[::step], ys[::step]))
    return convex_hull(points)


def score(
    background: np.ndarray,
    rendered: np.ndarray,
    scale: float,
    x: int,
    y: int,
) -> float:
    del scale
    rgba = rendered
    left = max(0, x)
    top = max(0, y)
    right = min(background.shape[1], x + rgba.shape[1])
    bottom = min(background.shape[0], y + rgba.shape[0])
    if right <= left or bottom <= top:
        return float("inf")

    source_left = left - x
    source_top = top - y
    patch = rgba[
        source_top : source_top + bottom - top,
        source_left : source_left + right - left,
    ]
    mask = patch[:, :, 3] >= 180
    if mask.sum() < 250:
        return float("inf")

    background_patch = background[top:bottom, left:right]
    delta = np.abs(patch[:, :, :3] - background_patch)
    luminance_delta = np.mean(delta, axis=2)
    source_lum = np.mean(patch[:, :, :3], axis=2)
    background_lum = np.mean(background_patch, axis=2)
    source_values = source_lum[mask] - float(np.mean(source_lum[mask]))
    background_values = (
        background_lum[mask] - float(np.mean(background_lum[mask]))
    )
    denominator = float(
        np.sqrt(
            np.sum(source_values * source_values)
            * np.sum(background_values * background_values)
        )
    )
    normalised_correlation = (
        float(np.sum(source_values * background_values)) / denominator
        if denominator > 0
        else -1.0
    )
    source_chroma = np.max(patch[:, :, :3], axis=2) - np.min(
        patch[:, :, :3],
        axis=2,
    )
    background_chroma = np.max(background_patch, axis=2) - np.min(
        background_patch,
        axis=2,
    )
    source_chroma_values = source_chroma[mask] - float(
        np.mean(source_chroma[mask])
    )
    background_chroma_values = background_chroma[mask] - float(
        np.mean(background_chroma[mask])
    )
    chroma_denominator = float(
        np.sqrt(
            np.sum(source_chroma_values * source_chroma_values)
            * np.sum(background_chroma_values * background_chroma_values)
        )
    )
    chroma_correlation = (
        float(np.sum(source_chroma_values * background_chroma_values))
        / chroma_denominator
        if chroma_denominator > 0
        else -1.0
    )
    fill_delta = float(np.median(luminance_delta[mask]))
    outside = int(np.count_nonzero(rgba[:, :, 3] >= 180)) - int(mask.sum())
    combined_correlation = normalised_correlation * 0.65 + chroma_correlation * 0.35
    return (1.0 - combined_correlation) * 100.0 + fill_delta * 0.08 + outside * 0.2


def align(
    background: np.ndarray,
    source: Image.Image,
    scales: np.ndarray,
    xs: range,
    ys: range,
) -> tuple[float, float, int, int]:
    best = (float("inf"), 0.0, 0, 0)
    xs_working = range(xs.start // WORK_SCALE, xs.stop // WORK_SCALE + 1)
    ys_working = range(ys.start // WORK_SCALE, ys.stop // WORK_SCALE + 1)
    for scale in scales:
        rendered = np.asarray(
            scaled_figure(source, float(scale)),
            dtype=np.float32,
        )
        for x in xs_working:
            for y in ys_working:
                value = score(background, rendered, float(scale), x, y)
                if value < best[0]:
                    best = (value, float(scale), x, y)

    _, coarse_scale, coarse_x, coarse_y = best
    fine_scales = np.arange(coarse_scale - 0.002, coarse_scale + 0.0021, 0.001)
    for scale in fine_scales:
        rendered = np.asarray(
            scaled_figure(source, float(scale)),
            dtype=np.float32,
        )
        for x in range(coarse_x - 1, coarse_x + 2):
            for y in range(coarse_y - 1, coarse_y + 2):
                value = score(background, rendered, float(scale), x, y)
                if value < best[0]:
                    best = (value, float(scale), x, y)
    _, scale, x, y = best
    return best[0], scale, x * WORK_SCALE, y * WORK_SCALE


def main() -> None:
    background_image = Image.open(BACKGROUND).convert("RGBA")
    original_background = np.asarray(background_image.convert("RGB"), dtype=np.float32)
    working_background = np.asarray(
        background_image.convert("RGB").resize(
            (
                round(background_image.width / WORK_SCALE),
                round(background_image.height / WORK_SCALE),
            ),
            Image.Resampling.LANCZOS,
        ),
        dtype=np.float32,
    )
    results: dict[str, dict[str, float | int | str | list[int]]] = {}

    for key, config in ENTRIES.items():
        source = Image.open(ENTRY_DIR / config["file"]).convert("RGBA")
        working_source = source.resize(
            (
                round(source.width / WORK_SCALE),
                round(source.height / WORK_SCALE),
            ),
            Image.Resampling.LANCZOS,
        )
        best_score, scale, x, y = align(
            working_background,
            working_source,
            config["scales"],
            config["x"],
            config["y"],
        )
        final_score, final_scale, final_x, final_y = (
            best_score,
            scale,
            x,
            y,
        )
        alpha_bounds = source.getchannel("A").getbbox()
        results[key] = {
            "file": f"images/street-entries/{config['file']}",
            "sourceWidth": source.width,
            "sourceHeight": source.height,
            "alphaBounds": list(alpha_bounds or (0, 0, source.width, source.height)),
            "scale": round(final_scale, 4),
            "x": final_x,
            "y": final_y,
            "score": round(final_score, 4),
            "hitPolygon": hit_polygon(source),
        }
        print(key, results[key])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    preview = background_image.copy()
    for config in results.values():
        source = Image.open(ROOT / "web" / config["file"]).convert("RGBA")
        figure = scaled_figure(source, float(config["scale"]))
        figure.putalpha(
            figure.getchannel("A").point(lambda value: round(value * 0.5))
        )
        preview.alpha_composite(figure, (int(config["x"]), int(config["y"])))
    preview.convert("RGB").save(PREVIEW)
    print(json.dumps({"report": str(OUTPUT), "preview": str(PREVIEW)}))


if __name__ == "__main__":
    main()
