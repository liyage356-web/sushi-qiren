from pathlib import Path

from PIL import Image


SOURCE_DIR = Path(r"C:\Users\liyage\Pictures")
TARGET_DIR = (
    Path(__file__).resolve().parent.parent / "public" / "assets" / "goubuli"
)
SOURCE_NAMES = [
    "pleat-00.png.png",
    "pleat-03.png.png",
    "pleat-06.png.png",
    "pleat-09.png.png",
    "pleat-12.png.png",
    "pleat-15.png.png",
    "pleat-18.png.png",
]
TARGET_SIZE = (1670, 942)


def normalize_canvas(image: Image.Image) -> Image.Image:
    if image.size == TARGET_SIZE:
        return image

    # The ninth source frame is one pixel shorter. Its content aligns with a
    # one-pixel crop from the other frames, so repeat the top row rather than
    # resampling and introducing subpixel drift in the hands and bun.
    normalized = Image.new("RGB", TARGET_SIZE, image.getpixel((0, 0)))
    normalized.paste(image, (0, TARGET_SIZE[1] - image.height))
    return normalized


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    for name in SOURCE_NAMES:
        source = Image.open(SOURCE_DIR / name).convert("RGB")
        normalized = normalize_canvas(source)
        target = TARGET_DIR / f"{Path(name).stem.split('.')[0]}.webp"
        normalized.save(target, "WEBP", lossless=True, method=6)
        print(f"{source.size} -> {normalized.size} {target.name}")


if __name__ == "__main__":
    main()
