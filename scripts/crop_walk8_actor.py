from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web" / "si-shi-ba-yang" / "assets" / "yu-liu-cutout.png"
TARGET = (
    ROOT
    / "web"
    / "si-shi-ba-yang"
    / "assets"
    / "walk8"
    / "yu-liu-walk8-portrait.png"
)


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    # Preserve the existing transparent artwork while limiting the layer to
    # Yu Liu's body for later route-driven movement.
    actor = image.crop((650, 45, 1115, 1318))
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    actor.save(TARGET, "PNG", optimize=True)
    print(f"saved {TARGET} {actor.size}")


if __name__ == "__main__":
    main()
