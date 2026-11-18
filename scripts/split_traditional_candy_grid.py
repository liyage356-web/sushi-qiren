from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


CARD_NAMES = [
    "茶膏糖",
    "丹桂糖",
    "鲜姜糖",
    "玫瑰糖",
    "豆蔻糖",
    "橘皮糖",
    "薄荷糖",
    "酸梅糖",
    "鸭梨糖",
    "枇杷糖",
    "西瓜糖",
    "樱桃糖",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Split the supplied 3x4 traditional candy sheet into twelve images."
    )
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    return parser.parse_args()


def split_sheet(source: Path, output: Path) -> None:
    sheet = Image.open(source).convert("RGB")
    output.mkdir(parents=True, exist_ok=True)
    sheet.save(output.parent / "traditional-candy-12-grid.png", optimize=True)

    # These boundaries follow the visible gutters and keep each complete hand-drawn border.
    left_edges = [20, 435, 849, 1263]
    right_edges = [423, 839, 1251, 1660]
    top_edges = [20, 323, 620]
    bottom_edges = [315, 612, 921]

    for index, name in enumerate(CARD_NAMES):
        row, column = divmod(index, 4)
        card = sheet.crop(
            (
                left_edges[column],
                top_edges[row],
                right_edges[column],
                bottom_edges[row],
            )
        )
        filename = f"{index + 1:02d}-{name}.png"
        card.save(output / filename, optimize=True)


if __name__ == "__main__":
    arguments = parse_args()
    split_sheet(arguments.source, arguments.output)
