"""Build a compact alpha-hit bitmap for the supplied Sea Zhang Wu cutout."""

from __future__ import annotations

import base64
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = (
    ROOT
    / "public"
    / "images"
    / "haizhangwu"
    / "sea-zhang-wu-supplied-20261116.png"
)
OUTPUT = ROOT / "web" / "haizhangwu-hit-mask.js"
SIZE = 256
ALPHA_THRESHOLD = 8


def main() -> None:
    alpha = (
        Image.open(SOURCE)
        .convert("RGBA")
        .getchannel("A")
        .resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    )
    packed = bytearray()
    current = 0
    bit_count = 0
    pixels = (
        alpha.get_flattened_data()
        if hasattr(alpha, "get_flattened_data")
        else alpha.getdata()
    )
    for value in pixels:
        current = (current << 1) | int(value > ALPHA_THRESHOLD)
        bit_count += 1
        if bit_count == 8:
            packed.append(current)
            current = 0
            bit_count = 0
    if bit_count:
        packed.append(current << (8 - bit_count))

    data = base64.b64encode(packed).decode("ascii")
    payload = {
        "width": SIZE,
        "height": SIZE,
        "threshold": ALPHA_THRESHOLD,
        "data": data,
    }
    OUTPUT.write_text(
        "(() => {\n"
        '  "use strict";\n\n'
        "  window.HAIZHANGWU_HIT_MASK = Object.freeze("
        + json.dumps(payload, ensure_ascii=False)
        + ");\n"
        "})();\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "source": str(SOURCE.relative_to(ROOT)),
                "output": str(OUTPUT.relative_to(ROOT)),
                "size": SIZE,
                "bytes": len(packed),
                "base64Chars": len(data),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
