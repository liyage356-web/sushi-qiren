from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = PROJECT_ROOT / "public" / "assets" / "goubuli"
SOURCE_ROOT = PROJECT_ROOT / "狗不理"
PICTURES_ROOT = Path.home() / "Pictures"


def save_webp(source: Path, destination: Path, quality: int) -> None:
    with Image.open(source) as image:
        image.convert("RGB").save(
            destination,
            "WEBP",
            quality=quality,
            method=6,
        )


save_webp(
    PICTURES_ROOT / "空碗与蒸笼的暖色餐桌.png",
    OUTPUT_ROOT / "scene-mixing.webp",
    quality=86,
)

for index in range(1, 6):
    save_webp(
        SOURCE_ROOT / f"mix-{index:02d}.png.png",
        OUTPUT_ROOT / f"mixing-state-{index:02d}.webp",
        quality=84,
    )

print("Prepared the mixing background and five bowl-state images.")
