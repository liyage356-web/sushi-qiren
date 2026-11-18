from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
PAIRS = [
    (
        "Haizhangwu viewer",
        "paper-background-before-haizhangwu-viewer-1440x900.png",
        "paper-background-after-haizhangwu-viewer-1440x900.png",
    ),
    (
        "Clay workshop",
        "paper-background-before-clay-welcome-1440x900.png",
        "paper-background-after-clay-welcome-1440x900.png",
    ),
]
TILE_WIDTH = 720
TILE_HEIGHT = 450
LABEL_HEIGHT = 42
GAP = 20


def main() -> None:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
    canvas = Image.new(
        "RGB",
        (TILE_WIDTH * 2 + GAP * 3, (TILE_HEIGHT + LABEL_HEIGHT) * 2 + GAP * 3),
        "#dfd8c9",
    )
    draw = ImageDraw.Draw(canvas)

    for row, (title, before_name, after_name) in enumerate(PAIRS):
        for column, (label, filename) in enumerate(
            (("Before", before_name), ("After", after_name))
        ):
            image = Image.open(ROOT / filename).convert("RGB")
            image = image.resize((TILE_WIDTH, TILE_HEIGHT), Image.Resampling.LANCZOS)
            x = GAP + column * (TILE_WIDTH + GAP)
            y = GAP + row * (TILE_HEIGHT + LABEL_HEIGHT + GAP)
            draw.rectangle(
                (x, y, x + TILE_WIDTH, y + LABEL_HEIGHT),
                fill="#ede6d6",
            )
            draw.text(
                (x + 16, y + 9),
                f"{title} | {label}",
                fill="#3f3a32",
                font=font,
            )
            canvas.paste(image, (x, y + LABEL_HEIGHT))

    canvas.save(ROOT / "paper-background-before-after-comparison.png")


if __name__ == "__main__":
    main()
