from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PICTURES = Path(r"C:\Users\liyage\Pictures")

BACKGROUND = PICTURES / "天津街巷泥人张招牌.png"
BUN_SELLER = PICTURES / "抠图 (4).png"
HEI_TOU = PICTURES / "抠图.png"
CANDY_SELLER = PICTURES / "俞家药糖挑担小贩插画.png"
CLAY_SIGN = PICTURES / "泥人张水墨招牌.png"

OUTPUT = ROOT / "output" / "入巷全景_图一人物招牌合成_招牌对齐版.png"
WEB_OUTPUT = ROOT / "web" / "images" / "tianjin-street-scene-reference-v5.png"


def trim_transparent(image: Image.Image) -> Image.Image:
    """Trim only the transparent pixels, preserving all painted content."""
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if not len(xs):
        raise ValueError("Image has no visible pixels")
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    return image.crop(box)


def resize_to_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def add_contact_shadow(
    canvas: Image.Image, mask: Image.Image, position: tuple[int, int]
) -> None:
    """Add a restrained shadow immediately beneath the inserted figure."""
    shadow_width = max(32, round(mask.width * 0.76))
    shadow_height = max(10, round(mask.width * 0.075))
    footprint = mask.resize(
        (shadow_width, shadow_height), Image.Resampling.LANCZOS
    ).filter(ImageFilter.GaussianBlur(radius=5.5))
    shadow = Image.new("RGBA", footprint.size, (47, 45, 39, 0))
    shadow.putalpha(
        footprint.point(lambda value: round(value * 52 / 255))
    )
    shadow_x = position[0] + round((mask.width - shadow_width) / 2)
    shadow_y = position[1] + mask.height - round(shadow_height * 0.75)
    canvas.alpha_composite(shadow, (shadow_x, shadow_y))


def place_figure(
    canvas: Image.Image,
    image: Image.Image,
    center_x: int,
    baseline_y: int,
) -> tuple[int, int, int, int]:
    left = round(center_x - image.width / 2)
    top = baseline_y - image.height
    position = (left, top)
    add_contact_shadow(canvas, image.getchannel("A"), position)
    canvas.alpha_composite(image, position)
    return (left, top, left + image.width, baseline_y)


def place_sign(
    canvas: Image.Image,
    sign: Image.Image,
    center_x: int,
    top_y: int,
) -> tuple[int, int, int, int]:
    left = round(center_x - sign.width / 2)
    canvas.alpha_composite(sign, (left, top_y))
    return (left, top_y, left + sign.width, top_y + sign.height)


def main() -> None:
    background = Image.open(BACKGROUND).convert("RGBA")
    scene = background.copy()

    candy = resize_to_height(trim_transparent(Image.open(CANDY_SELLER).convert("RGBA")), 390)
    hei_tou = resize_to_height(trim_transparent(Image.open(HEI_TOU).convert("RGBA")), 226)
    bun = resize_to_height(trim_transparent(Image.open(BUN_SELLER).convert("RGBA")), 350)
    sign = resize_to_height(trim_transparent(Image.open(CLAY_SIGN).convert("RGBA")), 114)

    # Positions follow the supplied C.jpg placement reference after converting
    # its 2153x1205 coordinate system to the native 1675x939 background.
    boxes = [
        place_figure(scene, candy, center_x=545, baseline_y=895),
        place_figure(scene, hei_tou, center_x=1044, baseline_y=732),
        place_figure(scene, bun, center_x=1248, baseline_y=881),
        place_sign(scene, sign, center_x=728, top_y=382),
    ]

    final = scene.convert("RGB")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    WEB_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUTPUT, format="PNG", optimize=True)
    final.save(WEB_OUTPUT, format="PNG", optimize=True)
    print(f"saved: {OUTPUT}")
    print(f"saved: {WEB_OUTPUT}")
    print(f"boxes: {boxes}")


if __name__ == "__main__":
    main()
