from pathlib import Path

from PIL import Image


SOURCE_DIR = Path(r"C:\Users\liyage\Desktop\黑头照片素材")
OUTPUT_DIR = (
    Path(__file__).resolve().parents[1] / "web" / "images" / "hei-tou"
)

ASSETS = [
    ("水乡码头街景与粮铺.png", "beida-guan.webp", 1672, 90),
    ("黑白斑驳的警觉卷毛狗.png", "hei-tou-alert.webp", 1200, 91),
    ("河埠头的黑头狗.png", "wharf-with-dogs.webp", 1672, 88),
    ("复古海货店街景水墨画.png", "longchang-street.webp", 1672, 90),
    ("水彩墨韵左向鱼头.png", "fish-head.webp", 900, 91),
    ("商大爷的温和邀手.png", "shopkeeper-invite.webp", 700, 91),
    ("商家门前迎客图.png", "merchant-gate.webp", 1672, 88),
    ("隆昌海货店喂狗图.png", "longchang-feed-dog.webp", 1672, 88),
]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_name, output_name, width, quality in ASSETS:
        image = Image.open(SOURCE_DIR / source_name)
        image.thumbnail((width, width * 2), Image.Resampling.LANCZOS)
        image.save(
            OUTPUT_DIR / output_name,
            "WEBP",
            quality=quality,
            method=6,
        )

    for asset in sorted(OUTPUT_DIR.glob("*.webp")):
        print(f"{asset.name}: {asset.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
