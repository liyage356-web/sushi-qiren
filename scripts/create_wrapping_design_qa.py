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
        ("素材 · 取皮前", SOURCE / "wrap-bg.png.png", "实现 · 取皮前", ROOT / "gou-bu-li-wrapping-initial-desktop.png"),
        ("素材 · 托起面皮", SOURCE / "wrap-01.png.png", "实现 · 托起面皮", ROOT / "gou-bu-li-wrapping-dough-desktop.png"),
        ("素材 · 放入肉馅", SOURCE / "wrap-02.png.png", "实现 · 放入肉馅", ROOT / "gou-bu-li-wrapping-filling-desktop.png"),
        ("素材 · 右手靠近", SOURCE / "pleat-00.png.png", "实现 · 右手靠近", ROOT / "gou-bu-li-wrapping-complete-desktop.png"),
    ]
    image_size = (650, 367)
    gutter = 24
    output = Image.new(
        "RGB",
        (image_size[0] * 2 + gutter * 3, (image_size[1] + 38 + gutter) * 4 + gutter),
        (28, 34, 30),
    )

    for row, (source_label, source_path, implementation_label, implementation_path) in enumerate(pairs):
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

    output_path = ROOT / "wrapping-design-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


def create_focus_comparison() -> Path:
    source = Image.open(SOURCE / "wrap-01.png.png").convert("RGB")
    implementation = Image.open(
        ROOT / "gou-bu-li-wrapping-dough-desktop.png"
    ).convert("RGB")
    source_crop = source.crop((535, 245, 1175, 800)).resize(
        (900, 780), Image.Resampling.LANCZOS
    )
    implementation_crop = implementation.crop((420, 190, 923, 626)).resize(
        (900, 780), Image.Resampling.LANCZOS
    )

    output = Image.new("RGB", (1840, 836), (28, 34, 30))
    output.paste(label_band(900, "素材细节 · 左手托皮", (103, 54, 41)), (10, 10))
    output.paste(source_crop, (10, 48))
    output.paste(
        label_band(900, "实现细节 · 左手托皮与热点", (54, 80, 66)),
        (930, 10),
    )
    output.paste(implementation_crop, (930, 48))

    output_path = ROOT / "wrapping-focus-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


def create_approach_focus_comparison() -> Path:
    source = Image.open(SOURCE / "pleat-00.png.png").convert("RGB")
    implementation = Image.open(
        ROOT / "gou-bu-li-wrapping-complete-desktop.png"
    ).convert("RGB")
    source_crop = source.crop((360, 275, 1200, 835)).resize(
        (940, 626), Image.Resampling.LANCZOS
    )
    implementation_crop = implementation.crop((283, 216, 943, 656)).resize(
        (940, 626), Image.Resampling.LANCZOS
    )

    output = Image.new("RGB", (1920, 682), (28, 34, 30))
    output.paste(
        label_band(940, "素材细节 · 肉馅与右手靠近", (103, 54, 41)),
        (10, 10),
    )
    output.paste(source_crop, (10, 48))
    output.paste(
        label_band(940, "实现细节 · 右手靠近与提示", (54, 80, 66)),
        (970, 10),
    )
    output.paste(implementation_crop, (970, 48))

    output_path = ROOT / "wrapping-approach-focus-comparison.png"
    output.save(output_path, optimize=True)
    return output_path


if __name__ == "__main__":
    print(create_full_comparison())
    print(create_focus_comparison())
    print(create_approach_focus_comparison())
