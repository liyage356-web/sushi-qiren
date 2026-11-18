"""Remove invisible export dust from the archive bag's transparent margin.

The source artwork is kept at its original resolution. Only alpha values at or
below the export-noise threshold are cleared, so the painted bag, text, stamps,
paper texture and anti-aliased silhouette above that threshold remain intact.
"""

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web" / "assets" / "archive" / "archive-bag-body.png"
OUTPUT = ROOT / "web" / "assets" / "archive" / "archive-bag-body-clean.png"
ALPHA_NOISE_MAX = 16


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    pixels = np.array(source)
    alpha = pixels[:, :, 3]
    noisy_margin = alpha <= ALPHA_NOISE_MAX
    cleaned = pixels.copy()
    cleaned[:, :, 3] = np.where(noisy_margin, 0, alpha).astype(np.uint8)

    # Verify that the visible artwork is unchanged and the edge residue is gone.
    assert cleaned.shape == pixels.shape
    assert np.array_equal(cleaned[:, :, :3], pixels[:, :, :3])
    assert int(cleaned[:, :, 3].max()) == int(alpha.max())
    assert not np.any(
        (cleaned[:, :, 3] > 0) & (cleaned[:, :, 3] <= ALPHA_NOISE_MAX)
    )

    Image.fromarray(cleaned, "RGBA").save(OUTPUT, optimize=True)
    print(
        {
            "source": str(SOURCE),
            "output": str(OUTPUT),
            "size": source.size,
            "cleared_pixels": int(noisy_margin.sum()),
            "alpha_threshold": ALPHA_NOISE_MAX,
        }
    )


if __name__ == "__main__":
    main()
