"""Build a scene-aligned Sea Zhang Wu overlay from the source illustration.

The supplied transparent figure is useful as a silhouette and hit target, but
its painted interior is not an exact match for the figure already present in
the Tianqingguan scene. This script uses the calibrated supplied cutout only as
a mask, then copies the matching scene pixels into the interactive overlay.
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = (
    ROOT / "web" / "assets" / "ni-ren-zhang" / "sea-zhang-wu-enters-tianqingguan.png"
)
SOURCE = (
    ROOT / "public" / "images" / "haizhangwu" / "sea-zhang-wu-supplied-20261116.png"
)
OVERLAY = (
    ROOT
    / "web"
    / "assets"
    / "ni-ren-zhang"
    / "sea-zhang-wu-insitu-overlay.png"
)
HIT_MASK = ROOT / "web" / "haizhangwu-hit-mask.js"
REPORT = ROOT / "output" / "haizhangwu-insitu-extraction.json"
PREVIEW = ROOT / "output" / "haizhangwu-insitu-extraction-preview.png"
MASK_PREVIEW = ROOT / "output" / "haizhangwu-insitu-mask-preview.png"

# The existing calibration was computed from the visible silhouette of the
# supplied cutout against the scene. It remains useful for the mask shape, even
# though its painted interior is different.
SOURCE_LEFT = 252
SOURCE_TOP = 162
SOURCE_SCALE = 0.86
EDGE_EXPANSION = 9
HIT_MASK_WIDTH = 334
HIT_MASK_HEIGHT = 188
HIT_MASK_THRESHOLD = 8


def packed_hit_mask(mask: Image.Image) -> dict[str, int | str]:
    resized = mask.resize(
        (HIT_MASK_WIDTH, HIT_MASK_HEIGHT),
        Image.Resampling.LANCZOS,
    )
    packed = bytearray()
    current = 0
    bit_count = 0
    pixels = (
        resized.get_flattened_data()
        if hasattr(resized, "get_flattened_data")
        else resized.getdata()
    )
    for value in pixels:
        current = (current << 1) | int(value > HIT_MASK_THRESHOLD)
        bit_count += 1
        if bit_count == 8:
            packed.append(current)
            current = 0
            bit_count = 0
    if bit_count:
        packed.append(current << (8 - bit_count))
    return {
        "width": HIT_MASK_WIDTH,
        "height": HIT_MASK_HEIGHT,
        "threshold": HIT_MASK_THRESHOLD,
        "data": base64.b64encode(packed).decode("ascii"),
    }


def main() -> None:
    background = Image.open(BACKGROUND).convert("RGBA")
    source = Image.open(SOURCE).convert("RGBA")
    scene_size = background.size

    rendered_size = (
        max(1, round(source.width * SOURCE_SCALE)),
        max(1, round(source.height * SOURCE_SCALE)),
    )
    source_alpha = source.getchannel("A").resize(
        rendered_size,
        Image.Resampling.LANCZOS,
    )

    mask = Image.new("L", scene_size, 0)
    mask.paste(source_alpha, (SOURCE_LEFT, SOURCE_TOP))
    # Expand by a few scene pixels so the extracted character always covers
    # anti-aliased ink just outside the supplied silhouette.
    expanded = mask.filter(
        ImageFilter.MaxFilter(EDGE_EXPANSION * 2 + 1)
    ).filter(ImageFilter.GaussianBlur(0.7))

    overlay = background.copy()
    overlay.putalpha(expanded)
    overlay.save(OVERLAY, optimize=True)

    # At full opacity this composite must be pixel-identical to the scene.
    composite = background.convert("RGB").copy()
    composite.paste(background.convert("RGB"), (0, 0), expanded)
    difference = ImageChops.difference(background.convert("RGB"), composite)
    diff_bbox = difference.getbbox()

    mask_rgb = Image.new("RGB", scene_size, (29, 27, 24))
    mask_rgb.paste((164, 66, 43), (0, 0), expanded)
    mask_rgb.save(MASK_PREVIEW, optimize=True)

    preview = background.convert("RGB").copy()
    preview.save(PREVIEW, optimize=True)

    alpha_bounds = overlay.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise RuntimeError("Generated overlay has no visible pixels.")

    hit_payload = packed_hit_mask(expanded)
    HIT_MASK.write_text(
        "(() => {\n"
        '  "use strict";\n\n'
        "  window.HAIZHANGWU_HIT_MASK = Object.freeze("
        + json.dumps(hit_payload, ensure_ascii=False)
        + ");\n"
        "})();\n",
        encoding="utf-8",
    )

    result = {
        "background": str(BACKGROUND.relative_to(ROOT)).replace("\\", "/"),
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "overlay": str(OVERLAY.relative_to(ROOT)).replace("\\", "/"),
        "hitMask": str(HIT_MASK.relative_to(ROOT)).replace("\\", "/"),
        "backgroundSize": {
            "width": scene_size[0],
            "height": scene_size[1],
        },
        "sourceTransform": {
            "left": SOURCE_LEFT,
            "top": SOURCE_TOP,
            "scale": SOURCE_SCALE,
        },
        "renderedSourceSize": {
            "width": rendered_size[0],
            "height": rendered_size[1],
        },
        "alphaBounds": {
            "left": alpha_bounds[0],
            "top": alpha_bounds[1],
            "right": alpha_bounds[2],
            "bottom": alpha_bounds[3],
        },
        "edgeExpansion": EDGE_EXPANSION,
        "fullOpacityDifferenceBbox": diff_bbox,
        "fullOpacityPixelExact": diff_bbox is None,
        "hitMaskSize": {
            "width": HIT_MASK_WIDTH,
            "height": HIT_MASK_HEIGHT,
        },
    }
    REPORT.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
