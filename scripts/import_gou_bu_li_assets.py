from pathlib import Path

from PIL import Image, ImageOps


SOURCE_DIR = Path(r"C:\Users\liyage\Pictures")
ASSET_DIR = Path(__file__).resolve().parents[1] / "public" / "assets" / "goubuli"


def open_image(filename: str) -> Image.Image:
    image = Image.open(SOURCE_DIR / filename)
    image = ImageOps.exif_transpose(image)
    return image.copy()


def save_webp(image: Image.Image, filename: str, quality: int = 88) -> None:
    image.save(
        ASSET_DIR / filename,
        "WEBP",
        quality=quality,
        method=6,
        alpha_quality=100 if image.mode == "RGBA" else 0,
    )
    print(f"{filename}: {image.width}x{image.height}")


def crop_fraction(
    image: Image.Image,
    left: float,
    top: float,
    right: float,
    bottom: float,
) -> Image.Image:
    width, height = image.size
    return image.crop(
        (
            round(width * left),
            round(height * top),
            round(width * right),
            round(height * bottom),
        )
    )


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)

    mixing_scene = open_image("手作包子馅：蒸笼与木桌前.png").convert("RGB")
    wrapping_scene = open_image("手作小笼包与面皮静物.png").convert("RGB")
    filling_scene = open_image("葱香肉馅青花瓷碗.png").convert("RGB")
    steaming_scene = open_image("空碗与蒸笼的暖色餐桌.png").convert("RGB")

    save_webp(mixing_scene, "scene-mixing.webp")
    save_webp(wrapping_scene, "scene-wrapping.webp")
    save_webp(filling_scene, "scene-pleating.webp")
    save_webp(steaming_scene, "scene-steaming.webp")

    save_webp(
        crop_fraction(filling_scene, 0.255, 0.255, 0.755, 0.925),
        "bowl-mixing.webp",
    )
    save_webp(
        crop_fraction(wrapping_scene, 0.265, 0.225, 0.745, 0.925),
        "dough-wrapping.webp",
    )
    save_webp(
        crop_fraction(wrapping_scene, 0.005, 0.005, 0.375, 0.36),
        "baozi-pleating.webp",
    )
    save_webp(
        crop_fraction(filling_scene, 0.63, 0.0, 1.0, 0.47),
        "steamer-steaming.webp",
    )

    save_webp(
        open_image("金汤排骨汤水彩插画.png").convert("RGBA"),
        "ingredient-soup.webp",
    )
    save_webp(
        open_image("水彩风切碎青葱堆.png").convert("RGBA"),
        "ingredient-scallion.webp",
    )
    save_webp(
        open_image("水彩风生肉馅堆.png").convert("RGBA"),
        "ingredient-meat.webp",
    )
    save_webp(
        open_image("水彩风手绘猪油块堆.png").convert("RGBA"),
        "ingredient-fat.webp",
    )

    # 页面总览中的四张小卡使用不同视角，避免和制作台里的主场景重复。
    save_webp(
        open_image("蓝白瓷碗盛满剁碎生猪肉.png").convert("RGB"),
        "overview-mixing.webp",
    )
    save_webp(
        open_image("葱香肉馅水墨静物.png").convert("RGB"),
        "overview-wrapping.webp",
    )
    save_webp(
        open_image("葱香猪肉馅与猪油丁.png").convert("RGB"),
        "overview-pleating.webp",
    )
    save_webp(
        open_image("青花瓷碗中的木筷肉馅.png").convert("RGB"),
        "overview-steaming.webp",
    )


if __name__ == "__main__":
    main()
