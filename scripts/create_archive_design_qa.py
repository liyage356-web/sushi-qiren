from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PICTURES = Path.home() / "Pictures"
CARD_BOX = (288, 118, 1072, 650)
CARD_SIZE = (784, 532)
PADDING = 24
LABEL_HEIGHT = 42


def main() -> None:
    canvas = Image.new(
        "RGB",
        (
            CARD_SIZE[0] * 2 + PADDING * 3,
            (CARD_SIZE[1] + LABEL_HEIGHT) * 5 + PADDING * 6,
        ),
        (238, 236, 229),
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=24)

    for index in range(1, 6):
        top = PADDING + (index - 1) * (CARD_SIZE[1] + LABEL_HEIGHT + PADDING)
        reference = Image.open(PICTURES / f"人物档案内页{index}.png").convert("RGB")
        implementation_name = (
            "archive-ready-1366.png"
            if index == 1
            else f"archive-ready-page{index}-1366.png"
        )
        implementation = Image.open(ROOT / implementation_name).convert("RGB")

        canvas.paste(
            reference.resize(CARD_SIZE, Image.Resampling.LANCZOS),
            (PADDING, top + LABEL_HEIGHT),
        )
        canvas.paste(
            implementation.crop(CARD_BOX).resize(
                CARD_SIZE, Image.Resampling.LANCZOS
            ),
            (PADDING * 2 + CARD_SIZE[0], top + LABEL_HEIGHT),
        )
        draw.text(
            (PADDING, top + 7),
            f"Reference {index:02d}",
            fill=(35, 31, 25),
            font=font,
        )
        draw.text(
            (PADDING * 2 + CARD_SIZE[0], top + 7),
            f"Implementation {index:02d}",
            fill=(141, 56, 41),
            font=font,
        )

    canvas.save(ROOT / "design-qa-comparison.png")


if __name__ == "__main__":
    main()
