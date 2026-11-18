from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = Path(r"C:\Users\liyage\Pictures\金汤排骨汤水彩插画.png")
FONT_PATH = ROOT / "web" / "fonts" / "NotoSerifSC-VF.ttf"


def trimmed_alpha_crop(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    return image.crop(bbox), bbox


def create_focused_comparison(font: ImageFont.FreeTypeFont) -> None:
    source = Image.open(SOURCE_PATH).convert("RGBA")
    source_crop, source_bbox = trimmed_alpha_crop(source)

    base = Image.open(ROOT / "public/assets/goubuli/scene-mixing.webp").convert("RGB")
    base_crop = base.crop((480, 120, 870, 380))
    rendered = Image.open(ROOT / "gou-bu-li-mixing-initial.png").convert("RGB")
    rendered_crop = rendered.crop((380, 95, 710, 335))

    panel_w, panel_h = 600, 300
    header_h = 38
    canvas = Image.new("RGB", (panel_w * 3, panel_h + header_h), "#17130f")
    draw = ImageDraw.Draw(canvas)
    labels = ["新汤碗素材", "底图原汤碗", "当前实现：旧碗完全覆盖"]

    for index, (image, label) in enumerate(zip([source_crop, base_crop, rendered_crop], labels)):
        thumb = ImageOps.contain(
            image,
            (panel_w - 28, panel_h - 28),
            Image.Resampling.LANCZOS,
        )
        x = index * panel_w + (panel_w - thumb.width) // 2
        y = header_h + (panel_h - thumb.height) // 2
        canvas.paste(thumb, (x, y))
        draw.text(
            (index * panel_w + 18, 7),
            label,
            font=font,
            fill="#f3e2c3",
        )

    canvas.save(ROOT / "mixing-soup-bowl-final-comparison.png")
    return source_bbox


def create_full_comparison(font: ImageFont.FreeTypeFont) -> None:
    reference = Image.open(
        r"C:\Users\liyage\Pictures\水彩木桌上的空花纹陶碗.png"
    ).convert("RGB")
    implementation = Image.open(ROOT / "gou-bu-li-mixing-initial.png").convert("RGB")
    target_w = 900
    reference_thumb = ImageOps.contain(
        reference,
        (target_w, 560),
        Image.Resampling.LANCZOS,
    )
    implementation_thumb = ImageOps.contain(
        implementation,
        (target_w, 560),
        Image.Resampling.LANCZOS,
    )

    panel_h = 610
    canvas = Image.new("RGB", (target_w * 2, panel_h), "#17130f")
    draw = ImageDraw.Draw(canvas)
    for index, (image, label) in enumerate(
        [(reference_thumb, "参考底图"), (implementation_thumb, "当前调馅画面")]
    ):
        x = index * target_w + (target_w - image.width) // 2
        y = 42 + (560 - image.height) // 2
        canvas.paste(image, (x, y))
        draw.text(
            (index * target_w + 20, 8),
            label,
            font=font,
            fill="#f3e2c3",
        )

    canvas.save(ROOT / "mixing-final-alignment-comparison-v2.png")


def main() -> None:
    font = ImageFont.truetype(str(FONT_PATH), 24)
    source_bbox = create_focused_comparison(font)
    create_full_comparison(font)
    print(f"source alpha bbox: {source_bbox}")
    print(ROOT / "mixing-soup-bowl-final-comparison.png")
    print(ROOT / "mixing-final-alignment-comparison-v2.png")


if __name__ == "__main__":
    main()
