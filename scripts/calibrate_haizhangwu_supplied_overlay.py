"""Calibrate the supplied square Sea Zhang Wu cutout against the scene."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from calibrate_haizhangwu_overlay import (
    ANALYSIS_SCALE,
    ROOT,
    resized_figure,
    score as edge_score,
    search,
)


BACKGROUND = (
    ROOT / "web" / "assets" / "ni-ren-zhang" / "sea-zhang-wu-enters-tianqingguan.png"
)
FIGURE = (
    ROOT
    / "public"
    / "images"
    / "haizhangwu"
    / "sea-zhang-wu-supplied-20261116.png"
)
OUTPUT = ROOT / "output" / "haizhangwu-supplied-overlay-calibration.json"
PREVIEW = ROOT / "output" / "haizhangwu-supplied-overlay-candidate.png"


def sample_score(
    background: np.ndarray,
    rgba: np.ndarray,
    source_points: tuple[np.ndarray, np.ndarray],
    x: int,
    y: int,
) -> float:
    source_ys, source_xs = source_points
    target_xs = source_xs + x
    target_ys = source_ys + y
    inside = (
        (target_xs >= 0)
        & (target_ys >= 0)
        & (target_xs < background.shape[1])
        & (target_ys < background.shape[0])
    )
    if inside.sum() < 8_000:
        return float("inf")

    source_rgb = rgba[source_ys[inside], source_xs[inside], :3]
    background_rgb = background[target_ys[inside], target_xs[inside]]
    deltas = np.abs(source_rgb - background_rgb).mean(axis=1)
    keep = deltas <= np.percentile(deltas, 96)
    return float(deltas[keep].mean())


def refine(
    background_image: Image.Image,
    source: Image.Image,
    scale: float,
    x: int,
    y: int,
) -> tuple[float, float, int, int]:
    background = np.asarray(background_image, dtype=np.float32)
    best = (float("inf"), scale, x, y)
    for candidate_scale in np.arange(scale - 0.004, scale + 0.0041, 0.0005):
        rgba = np.asarray(
            resized_figure(source, float(candidate_scale)),
            dtype=np.float32,
        )
        source_ys, source_xs = np.nonzero(rgba[:, :, 3] >= 248)
        source_points = (source_ys[::6], source_xs[::6])
        for candidate_x in range(x - 6, x + 7):
            for candidate_y in range(y - 6, y + 7):
                value = sample_score(
                    background,
                    rgba,
                    source_points,
                    candidate_x,
                    candidate_y,
                )
                if value < best[0]:
                    best = (
                        value,
                        float(candidate_scale),
                        candidate_x,
                        candidate_y,
                    )

    _, best_scale, best_x, best_y = best
    fine = (best[0], best_scale, best_x, best_y)
    for candidate_scale in np.arange(
        best_scale - 0.00045,
        best_scale + 0.00046,
        0.0001,
    ):
        rgba = np.asarray(
            resized_figure(source, float(candidate_scale)),
            dtype=np.float32,
        )
        source_ys, source_xs = np.nonzero(rgba[:, :, 3] >= 248)
        source_points = (source_ys[::2], source_xs[::2])
        for candidate_x in range(best_x - 1, best_x + 2):
            for candidate_y in range(best_y - 1, best_y + 2):
                value = sample_score(
                    background,
                    rgba,
                    source_points,
                    candidate_x,
                    candidate_y,
                )
                if value < fine[0]:
                    fine = (
                        value,
                        float(candidate_scale),
                        candidate_x,
                        candidate_y,
                    )
    _, best_scale, best_x, best_y = fine
    edge_best = (float("inf"), best_scale, best_x, best_y)
    for candidate_scale in (
        best_scale - 0.001,
        best_scale,
        best_scale + 0.001,
    ):
        for candidate_x in range(best_x - 1, best_x + 2):
            for candidate_y in range(best_y - 1, best_y + 2):
                value = edge_score(
                    background,
                    source,
                    float(candidate_scale),
                    candidate_x,
                    candidate_y,
                )
                if value < edge_best[0]:
                    edge_best = (
                        value,
                        float(candidate_scale),
                        candidate_x,
                        candidate_y,
                    )
    return (
        edge_best[0],
        round(edge_best[1], 6),
        edge_best[2],
        edge_best[3],
    )


def main() -> None:
    background_image = Image.open(BACKGROUND).convert("RGB")
    source = Image.open(FIGURE).convert("RGBA")
    background = np.asarray(
        background_image.resize(
            (
                round(background_image.width / ANALYSIS_SCALE),
                round(background_image.height / ANALYSIS_SCALE),
            ),
            Image.Resampling.LANCZOS,
        ),
        dtype=np.float32,
    )
    working_source = source.resize(
        (
            round(source.width / ANALYSIS_SCALE),
            round(source.height / ANALYSIS_SCALE),
        ),
        Image.Resampling.LANCZOS,
    )

    coarse = search(
        background,
        working_source,
        np.arange(0.66, 0.921, 0.02),
        range(65, 116),
        range(35, 66),
    )
    _, coarse_scale, coarse_x, coarse_y, _ = coarse
    fine = search(
        background,
        working_source,
        np.arange(coarse_scale - 0.015, coarse_scale + 0.016, 0.0025),
        range(coarse_x - 4, coarse_x + 5),
        range(coarse_y - 4, coarse_y + 5),
    )

    _, scale, x, y, _ = fine
    x *= ANALYSIS_SCALE
    y *= ANALYSIS_SCALE
    refinement_score, scale, x, y = refine(
        background_image,
        source,
        scale,
        x,
        y,
    )
    figure = resized_figure(source, scale)
    alpha_bounds = source.getchannel("A").getbbox()
    result = {
        "background": str(BACKGROUND.relative_to(ROOT)).replace("\\", "/"),
        "figure": str(FIGURE.relative_to(ROOT)).replace("\\", "/"),
        "backgroundSize": {
            "width": background_image.width,
            "height": background_image.height,
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
        "score": round(refinement_score, 6),
    }

    preview = background_image.convert("RGBA")
    preview.alpha_composite(figure, (x, y))
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    preview.convert("RGB").save(PREVIEW)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
