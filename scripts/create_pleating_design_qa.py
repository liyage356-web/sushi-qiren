from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(r"C:\Users\liyage\Pictures")
FONT_PATH = Path(r"C:\Windows\Fonts\msyh.ttc")


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def label_band(width: int, text: str, fill: tuple[int, int, int]) -> Image.Image:
    band = Image.new("RGB", (width, 38), fill)
    draw = ImageDraw.Draw(band)
    draw.text((16, 8), text, fill=(245, 238, 224), font=font(18))
    return band


def fit_image(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.resize(size, Image.Resampling.LANCZOS)


def create_full_comparison() -> Path:
    pairs = [
        ("素材 · 0 褶", 0),
        ("素材 · 3 褶", 3),
        ("素材 · 6 褶", 6),
        ("素材 · 9 褶", 9),
        ("素材 · 12 褶", 12),
        ("素材 · 15 褶", 15),
        ("素材 · 18 褶", 18),
    ]
    image_size = (640, 360)
    gutter = 22
    output = Image.new(
        "RGB",
        (
            image_size[0] * 2 + gutter * 3,
            (image_size[1] + 38 + gutter) * len(pairs) + gutter,
        ),
        (28, 34, 30),
    )

    for row, (source_label, count) in enumerate(pairs):
        top = gutter + row * (image_size[1] + 38 + gutter)
        left_source = gutter
        left_implementation = gutter * 2 + image_size[0]
        implementation = (
            ROOT / "gou-bu-li-pleating-initial-desktop.png"
            if count == 0
            else ROOT
            / f"gou-bu-li-pleating-{count:02d}-desktop.png"
        )
        output.paste(
            label_band(image_size[0], source_label, (103, 54, 41)),
            (left_source, top),
        )
        output.paste(
            fit_image(SOURCE / f"pleat-{count:02d}.png.png", image_size),
            (left_source, top + 38),
        )
        output.paste(
            label_band(
                image_size[0],
                f"实现 · {count} 褶",
                (54, 80, 66),
            ),
            (left_implementation, top),
        )
        output.paste(
            fit_image(implementation, image_size),
            (left_implementation, top + 38),
        )

    output_path = ROOT / "pleating-design-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


def create_focus_comparison() -> Path:
    source = Image.open(SOURCE / "pleat-18.png.png").convert("RGB")
    implementation = Image.open(
        ROOT / "gou-bu-li-pleating-complete-desktop.png"
    ).convert("RGB")
    source_crop = source.crop((350, 300, 1080, 800)).resize(
        (960, 660), Image.Resampling.LANCZOS
    )
    implementation_crop = implementation.crop((275, 235, 848, 627)).resize(
        (960, 660), Image.Resampling.LANCZOS
    )

    output = Image.new("RGB", (1960, 716), (28, 34, 30))
    output.paste(
        label_band(960, "素材细节 · 十八褶与捏合手部", (103, 54, 41)),
        (10, 10),
    )
    output.paste(source_crop, (10, 48))
    output.paste(
        label_band(960, "实现细节 · 十八褶与完成提示", (54, 80, 66)),
        (990, 10),
    )
    output.paste(implementation_crop, (990, 48))

    output_path = ROOT / "pleating-focus-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


if __name__ == "__main__":
    print(create_full_comparison())
    print(create_focus_comparison())
