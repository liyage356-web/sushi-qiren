from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_DIR = ROOT / "web" / "images" / "characters"
ASSETS = {
    "hei-tou.png": "hei-tou-card.png",
    "ni-ren-zhang.png": "ni-ren-zhang-card.png",
    "gou-bu-li.png": "gou-bu-li-card.png",
    "si-shi-ba-yang.png": "si-shi-ba-yang-card.png",
}
BACKGROUND_MARK = (1, 254, 1)


def remove_connected_paper(image: Image.Image) -> Image.Image:
    """Make the connected light paper around an illustration transparent."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    probe = rgb.copy()
    seeds = [
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
        (0, height // 2),
        (width - 1, height // 2),
    ]

    for seed in seeds:
        red, green, blue = probe.getpixel(seed)
        if min(red, green, blue) >= 238:
            ImageDraw.floodfill(probe, seed, BACKGROUND_MARK, thresh=28)

    result = rgb.convert("RGBA")
    result_pixels = result.load()
    probe_pixels = probe.load()
    for y in range(height):
        for x in range(width):
            if probe_pixels[x, y] == BACKGROUND_MARK:
                red, green, blue, _ = result_pixels[x, y]
                result_pixels[x, y] = (red, green, blue, 0)
    return result


for source_name, output_name in ASSETS.items():
    source = CHARACTER_DIR / source_name
    output = CHARACTER_DIR / output_name
    with Image.open(source) as image:
        remove_connected_paper(image).save(output, optimize=True)
    print(f"{output.relative_to(ROOT)}")
