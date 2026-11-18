from pathlib import Path
from collections import deque

import numpy as np
from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "figma-homepage-reference-left.png"
CURRENT = ROOT / "figma-homepage-final-export.png"
OUTPUT = ROOT / "figma-homepage-left-layout-check.png"


def label(image: Image.Image, text: str) -> Image.Image:
    panel = Image.new("RGB", (image.width, image.height + 34), "#202020")
    panel.paste(image, (0, 34))
    ImageDraw.Draw(panel).text((14, 10), text, fill="#f2f2f2")
    return panel


reference = Image.open(REFERENCE).convert("RGB")
current = Image.open(CURRENT).convert("RGB")
overlay = Image.blend(reference, current, 0.5)

output = Image.new("RGB", (reference.width * 3 + 32, reference.height + 34), "#202020")
for index, image in enumerate((label(reference, "REFERENCE"), label(current, "CURRENT"), label(overlay, "50% OVERLAY"))):
    output.paste(image, (index * (reference.width + 16), 0))

output.save(OUTPUT)
print(OUTPUT)


def component_boxes(image: Image.Image, threshold: int = 140) -> list[tuple[int, int, int, int, int]]:
    pixels = np.asarray(image.convert("RGB"), dtype=np.int16)
    mask = pixels.mean(axis=2) < threshold
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    boxes = []
    for y, x in zip(*np.nonzero(mask & ~seen)):
        if seen[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        seen[y, x] = True
        min_x = max_x = int(x)
        min_y = max_y = int(y)
        count = 0
        while queue:
            cy, cx = queue.popleft()
            count += 1
            min_x = min(min_x, cx)
            max_x = max(max_x, cx)
            min_y = min(min_y, cy)
            max_y = max(max_y, cy)
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if count >= 80:
            boxes.append((min_x, min_y, max_x, max_y, count))
    return sorted(boxes, key=lambda box: (box[1], box[0]))


for source_name, image in (("REFERENCE", reference), ("CURRENT", current)):
    title_crop = image.crop((40, 100, 430, 460))
    boxes = component_boxes(title_crop)
    normalized = [
        (x0 + 40, y0 + 100, x1 + 40, y1 + 100, count)
        for x0, y0, x1, y1, count in boxes
    ]
    print(source_name, normalized)
