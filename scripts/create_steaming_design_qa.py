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
        (
            "素材 · 蒸笼合上",
            SOURCE / "steamer-closed.png.png",
            "实现 · 等待揭笼",
            ROOT / "gou-bu-li-steaming-initial-desktop.png",
        ),
        (
            "素材 · 蒸笼打开",
            SOURCE / "steamer-open.png.png",
            "实现 · 制作完成",
            ROOT / "gou-bu-li-steaming-complete-desktop.png",
        ),
    ]
    image_size = (900, 507)
    gutter = 24
    output = Image.new(
        "RGB",
        (image_size[0] * 2 + gutter * 3, (image_size[1] + 38 + gutter) * 2 + gutter),
        (28, 34, 30),
    )

    for row, (
        source_label,
        source_path,
        implementation_label,
        implementation_path,
    ) in enumerate(pairs):
        top = gutter + row * (image_size[1] + 38 + gutter)
        left_source = gutter
        left_implementation = gutter * 2 + image_size[0]
        output.paste(
            label_band(image_size[0], source_label, (103, 54, 41)),
            (left_source, top),
        )
        output.paste(
            fit_image(source_path, image_size),
            (left_source, top + 38),
        )
        output.paste(
            label_band(image_size[0], implementation_label, (54, 80, 66)),
            (left_implementation, top),
        )
        output.paste(
            fit_image(implementation_path, image_size),
            (left_implementation, top + 38),
        )

    output_path = ROOT / "steaming-design-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


def create_focus_comparison() -> Path:
    source = Image.open(SOURCE / "steamer-open.png.png").convert("RGB")
    implementation = Image.open(
        ROOT / "gou-bu-li-steaming-complete-desktop.png"
    ).convert("RGB")
    source_crop = source.crop((360, 300, 1390, 920)).resize(
        (1030, 620), Image.Resampling.LANCZOS
    )
    implementation_crop = implementation.crop((265, 210, 1080, 700)).resize(
        (1030, 620), Image.Resampling.LANCZOS
    )

    output = Image.new("RGB", (2100, 676), (28, 34, 30))
    output.paste(
        label_band(1030, "素材细节 · 开笼包子与笼盖", (103, 54, 41)),
        (10, 10),
    )
    output.paste(source_crop, (10, 48))
    output.paste(
        label_band(
            1030,
            "实现细节 · 开笼包子与笼盖",
            (54, 80, 66),
        ),
        (1060, 10),
    )
    output.paste(implementation_crop, (1060, 48))

    output_path = ROOT / "steaming-focus-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


if __name__ == "__main__":
    print(create_full_comparison())
    print(create_focus_comparison())
