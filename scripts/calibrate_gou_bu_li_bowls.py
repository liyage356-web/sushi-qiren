from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "goubuli"
OUTPUT_ROOT = ROOT / "output"
SCENE_PATH = ASSET_ROOT / "scene-mixing.webp"
SOUP_SOURCE = (
    Path.home()
    / "Pictures"
    / "狗不理"
    / "金汤排骨汤水彩插画.png"
)
BOWL_SOURCE = Path.home() / "Pictures" / "狗不理" / "蓝花水彩空陶碗.png"
SOUP_OUTPUT = ASSET_ROOT / "supplied-soup-bowl.png"
BOWL_OUTPUT = ASSET_ROOT / "supplied-blue-bowl.png"
SHELL_OUTPUT = ASSET_ROOT / "supplied-blue-bowl-shell.png"
CALIBRATION_OUTPUT = OUTPUT_ROOT / "gou-bu-li-bowl-calibration.json"
PREVIEW_OUTPUT = OUTPUT_ROOT / "gou-bu-li-bowl-calibration.png"

LOGICAL_WIDTH = 1920
LOGICAL_HEIGHT = 1080
SCENE_OBJECT_POSITION_Y = 0.56


def visible_crop(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value > 1 else 0)
    box = alpha.getbbox()
    if box is None:
        raise ValueError("Bowl source has no visible pixels.")
    return rgba.crop(box), box


def blurred_edge_map(image: Image.Image) -> np.ndarray:
    gray = image.convert("L").filter(ImageFilter.GaussianBlur(1.2))
    values = np.asarray(gray, dtype=np.float32)
    dx = np.zeros_like(values)
    dy = np.zeros_like(values)
    dx[:, 1:-1] = values[:, 2:] - values[:, :-2]
    dy[1:-1, :] = values[2:, :] - values[:-2, :]
    magnitude = np.hypot(dx, dy)
    return np.asarray(
        Image.fromarray(np.clip(magnitude, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(2.4)
        ),
        dtype=np.float32,
    )


def boundary_points(image: Image.Image, visible_fraction: float = 1.0) -> np.ndarray:
    alpha = image.getchannel("A")
    mask = np.asarray(alpha.point(lambda value: 255 if value > 5 else 0)) > 0
    interior = (
        np.asarray(
            Image.fromarray((mask * 255).astype(np.uint8)).filter(
                ImageFilter.MinFilter(5)
            )
        )
        > 0
    )
    boundary = mask & ~interior
    y, x = np.nonzero(boundary)
    if visible_fraction < 1:
        keep = y <= image.height * visible_fraction
        x = x[keep]
        y = y[keep]
    points = np.column_stack((x, y))
    stride = max(1, math.ceil(len(points) / 2400))
    return points[::stride]


def bilinear_sample(field: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0, field.shape[1] - 1)
    y = np.clip(y, 0, field.shape[0] - 1)
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, field.shape[1] - 1)
    y1 = np.minimum(y0 + 1, field.shape[0] - 1)
    tx = x - x0
    ty = y - y0
    top = field[y0, x0] * (1 - tx) + field[y0, x1] * tx
    bottom = field[y1, x0] * (1 - tx) + field[y1, x1] * tx
    return top * (1 - ty) + bottom * ty


def alignment_score(
    edge_map: np.ndarray,
    points: np.ndarray,
    target_size: tuple[int, int],
    left: int,
    top: int,
    width: int,
) -> float:
    target_width, target_height = target_size
    height = round(width * target_height / target_width)
    x = left + points[:, 0] * width / target_width
    y = top + points[:, 1] * height / target_height
    sampled = bilinear_sample(edge_map, x, y)
    return float(np.mean(sampled) + 0.18 * np.percentile(sampled, 75))


def coarse_to_fine_search(
    edge_map: np.ndarray,
    points: np.ndarray,
    target_size: tuple[int, int],
    width_range: tuple[int, int],
    left_range: tuple[int, int],
    top_range: tuple[int, int],
) -> dict[str, float | int]:
    def search(widths, lefts, tops) -> tuple[float, int, int, int]:
        best = (-1.0, 0, 0, 0)
        for width in widths:
            for left in lefts:
                for top in tops:
                    score = alignment_score(
                        edge_map, points, target_size, left, top, width
                    )
                    if score > best[0]:
                        best = (score, width, left, top)
        return best

    coarse = search(
        range(width_range[0], width_range[1] + 1, 8),
        range(left_range[0], left_range[1] + 1, 8),
        range(top_range[0], top_range[1] + 1, 8),
    )
    _, coarse_width, coarse_left, coarse_top = coarse
    fine = search(
        range(max(width_range[0], coarse_width - 8), min(width_range[1], coarse_width + 8) + 1),
        range(max(left_range[0], coarse_left - 8), min(left_range[1], coarse_left + 8) + 1),
        range(max(top_range[0], coarse_top - 8), min(top_range[1], coarse_top + 8) + 1),
    )
    score, width, left, top = fine
    target_width, target_height = target_size
    height = round(width * target_height / target_width)
    return {
        "score": round(score, 4),
        "left": left,
        "top": top,
        "width": width,
        "height": height,
    }


def logical_rect(
    scene_size: tuple[int, int], source_rect: dict[str, float | int]
) -> dict[str, float]:
    scene_width, scene_height = scene_size
    scale = LOGICAL_WIDTH / scene_width
    rendered_height = scene_height * scale
    offset_y = (LOGICAL_HEIGHT - rendered_height) * SCENE_OBJECT_POSITION_Y
    left = source_rect["left"] * scale
    top = source_rect["top"] * scale + offset_y
    width = source_rect["width"] * scale
    height = source_rect["height"] * scale
    return {
        "leftPx": round(left, 3),
        "topPx": round(top, 3),
        "widthPx": round(width, 3),
        "heightPx": round(height, 3),
        "leftPercent": round(left / LOGICAL_WIDTH * 100, 4),
        "topPercent": round(top / LOGICAL_HEIGHT * 100, 4),
        "widthPercent": round(width / LOGICAL_WIDTH * 100, 4),
        "heightPercent": round(height / LOGICAL_HEIGHT * 100, 4),
    }


def make_shell(image: Image.Image, position: dict[str, float | int]) -> Image.Image:
    shell = image.copy()
    alpha = np.asarray(shell.getchannel("A"), dtype=np.float32)
    y, x = np.mgrid[0 : shell.height, 0 : shell.width]
    center_x = shell.width * 0.505
    center_y = shell.height * 0.485
    radius_x = shell.width * 0.355
    radius_y = shell.height * 0.305
    normalized = ((x - center_x) / radius_x) ** 2 + (
        (y - center_y) / radius_y
    ) ** 2
    interior = np.clip((1.08 - normalized) / 0.16, 0, 1)
    alpha *= 1 - interior
    shell.putalpha(Image.fromarray(np.round(alpha).astype(np.uint8)))
    return shell


def compose_preview(
    scene: Image.Image,
    soup: Image.Image,
    soup_rect: dict[str, float | int],
    bowl: Image.Image,
    bowl_rect: dict[str, float | int],
) -> None:
    preview = scene.convert("RGBA")
    layer = Image.new("RGBA", preview.size, (0, 0, 0, 0))
    soup_resized = soup.resize(
        (int(soup_rect["width"]), int(soup_rect["height"])),
        Image.Resampling.LANCZOS,
    )
    bowl_resized = bowl.resize(
        (int(bowl_rect["width"]), int(bowl_rect["height"])),
        Image.Resampling.LANCZOS,
    )
    soup_resized.putalpha(soup_resized.getchannel("A").point(lambda value: value // 2))
    bowl_resized.putalpha(bowl_resized.getchannel("A").point(lambda value: value // 2))
    layer.alpha_composite(soup_resized, (int(soup_rect["left"]), int(soup_rect["top"])))
    layer.alpha_composite(bowl_resized, (int(bowl_rect["left"]), int(bowl_rect["top"])))
    preview.alpha_composite(layer)
    preview.convert("RGB").save(PREVIEW_OUTPUT)


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    scene = Image.open(SCENE_PATH).convert("RGB")
    soup, soup_box = visible_crop(Image.open(SOUP_SOURCE))
    bowl, bowl_box = visible_crop(Image.open(BOWL_SOURCE))
    soup.save(SOUP_OUTPUT, optimize=True)
    bowl.save(BOWL_OUTPUT, optimize=True)

    edges = blurred_edge_map(scene)
    soup_points = boundary_points(soup, visible_fraction=0.84)
    bowl_points = boundary_points(bowl)
    soup_rect = coarse_to_fine_search(
        edges,
        soup_points,
        soup.size,
        width_range=(220, 265),
        left_range=(510, 558),
        top_range=(160, 205),
    )
    bowl_rect = coarse_to_fine_search(
        edges,
        bowl_points,
        bowl.size,
        width_range=(760, 810),
        left_range=(445, 490),
        top_range=(258, 300),
    )

    shell = make_shell(bowl, bowl_rect)
    shell.save(SHELL_OUTPUT, optimize=True)
    calibration = {
        "scene": {
            "path": str(SCENE_PATH),
            "size": scene.size,
            "objectFit": "cover",
            "objectPosition": "center 56%",
        },
        "soup": {
            "source": str(SOUP_SOURCE),
            "sourceSize": Image.open(SOUP_SOURCE).size,
            "visibleCrop": soup_box,
            "croppedSize": soup.size,
            "sourceRect": soup_rect,
            "logicalRect": logical_rect(scene.size, soup_rect),
        },
        "bowl": {
            "source": str(BOWL_SOURCE),
            "sourceSize": Image.open(BOWL_SOURCE).size,
            "visibleCrop": bowl_box,
            "croppedSize": bowl.size,
            "sourceRect": bowl_rect,
            "logicalRect": logical_rect(scene.size, bowl_rect),
        },
    }
    CALIBRATION_OUTPUT.write_text(
        json.dumps(calibration, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    compose_preview(scene, soup, soup_rect, bowl, bowl_rect)
    print(json.dumps(calibration, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
