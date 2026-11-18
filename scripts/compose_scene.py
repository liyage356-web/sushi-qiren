from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PICTURES = Path(r"C:\Users\liyage\Pictures")
OUTPUT = ROOT / "output" / "入巷全景_纵深增强.png"

CANVAS_SIZE = (2160, 1205)
BACKGROUND = PICTURES / "首页16：9.png"
CHARACTERS = {
    "candy": PICTURES / "四十八样.png",
    "dog_woman": PICTURES / "抠图.png",
    "bun_seller": PICTURES / "抠图 (2).png",
}


def smoothstep(edge0, edge1, value):
    scaled = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def enhance_depth(scene):
    """Add restrained atmospheric depth without changing the street layout."""
    width, height = scene.size
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)

    # Perspective-aware distance field centred just beyond the street's
    # vanishing point. Near objects stay crisp; distant features recede.
    vx, vy = width * 0.545, height * 0.405
    distance = np.sqrt(
        ((xx - vx) / (width * 0.40)) ** 2
        + ((yy - vy) / (height * 0.34)) ** 2
    )
    depth = 1.0 - smoothstep(0.20, 1.35, distance)

    sharp = scene.filter(
        ImageFilter.UnsharpMask(radius=1.6, percent=145, threshold=2)
    )
    softened = scene.filter(ImageFilter.GaussianBlur(radius=3.35))
    atmospheric = Image.blend(sharp, softened, 0.62)

    depth_mask = Image.fromarray(
        np.clip(depth * 228, 0, 255).astype(np.uint8), mode="L"
    ).filter(ImageFilter.GaussianBlur(5))
    scene = Image.composite(atmospheric, sharp, depth_mask)

    # Pale haze gathers toward the far street and softens far edge contrast.
    arr = np.asarray(scene).astype(np.float32)
    haze_strength = np.clip((depth - 0.32) * 0.31, 0.0, 0.205)[..., None]
    ivory = np.array([246.0, 242.0, 233.0], dtype=np.float32)
    arr = arr * (1.0 - haze_strength) + ivory * haze_strength

    # Gentle foreground contrast/luminance shaping keeps the eye moving down
    # the street instead of flattening the whole illustration evenly.
    y_norm = yy / max(1, height - 1)
    x_norm = xx / max(1, width - 1)
    vignette = (
        np.clip((x_norm - 0.50) / 0.50, 0, 1) ** 2
        + np.clip((0.50 - x_norm) / 0.50, 0, 1) ** 2
    )
    bottom_weight = smoothstep(0.58, 1.0, y_norm)
    brightness = 1.015 - 0.035 * vignette - 0.025 * bottom_weight
    arr *= brightness[..., None]

    # A nearly neutral charcoal tone matches the supplied line art while
    # avoiding a harsh blue cast.
    tint = np.array([1.006, 1.000, 0.987], dtype=np.float32)
    arr *= tint
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def trimmed_character(path, name):
    image = Image.open(path).convert("RGBA")
    if name == "bun_seller":
        # The generated source carries a small opaque watermark at the far
        # lower-right. Clear it beyond the character's foot silhouette.
        alpha = np.array(image.getchannel("A"))
        alpha[1450:, 800:] = 0
        image.putalpha(Image.fromarray(alpha, mode="L"))
    bbox = image.getchannel("A").getbbox()
    image = image.crop(bbox)
    image = ImageEnhance.Color(image).enhance(0.90)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    return image


def clean_scene_native_dogs(scene):
    """Quiet the two original midground dogs that would duplicate the pairing."""
    # Most of the silhouettes will be covered by the inserted midground pair.
    # A cloned patch of nearby pavement clears the remaining exposed profile.
    patch = scene.crop((1528, 930, 1628, 1060)).resize(
        (130, 170), Image.Resampling.LANCZOS
    )
    patch = patch.filter(ImageFilter.GaussianBlur(radius=0.8))
    mask = Image.new("L", scene.size, 0)
    ImageDraw.Draw(mask).ellipse((1492, 766, 1622, 938), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=18))
    scene.paste(patch, (1492, 766), mask.crop((1492, 766, 1622, 936)))
    return scene


def scaled_height(image, target_height):
    target_width = round(image.width * target_height / image.height)
    return image.resize(
        (target_width, target_height), resample=Image.Resampling.LANCZOS
    )


def ground_shadow(mask, character_width, opacity=72):
    shadow_width = max(36, round(character_width * 0.92))
    shadow_height = max(13, round(character_width * 0.105))
    ground = mask.resize(
        (shadow_width, shadow_height), resample=Image.Resampling.LANCZOS
    )
    ground = ground.filter(ImageFilter.GaussianBlur(radius=7))
    shadow = Image.new("RGBA", ground.size, (35, 33, 30, 0))
    shadow.putalpha(ground.point(lambda p: round(p * opacity / 255)))
    return shadow


def contact_shadow(mask):
    shifted = Image.new("L", mask.size, 0)
    shifted.paste(mask, (7, 5))
    blurred = shifted.filter(ImageFilter.GaussianBlur(radius=3.4))
    shadow = Image.new("RGBA", mask.size, (28, 27, 25, 0))
    shadow.putalpha(blurred.point(lambda p: round(p * 92 / 255)))
    return shadow


def place_character(scene, character, center_x, baseline_y):
    width, height = character.size
    left = round(center_x - width / 2)
    top = round(baseline_y - height)

    mask = character.getchannel("A")
    ground = ground_shadow(mask, width)
    ground_pos = (
        round(center_x - ground.width / 2 + width * 0.055),
        round(baseline_y - ground.height * 0.58 + height * 0.025),
    )
    scene.alpha_composite(ground, ground_pos)

    edge = contact_shadow(mask)
    scene.alpha_composite(edge, (left, top))
    scene.alpha_composite(character, (left, top))
    return (left, top, left + width, baseline_y)


def compose():
    background = Image.open(BACKGROUND).convert("RGB").resize(
        CANVAS_SIZE, Image.Resampling.LANCZOS
    )
    scene = enhance_depth(background).convert("RGBA")
    scene = clean_scene_native_dogs(scene)

    candy = scaled_height(trimmed_character(CHARACTERS["candy"], "candy"), 552)
    dog_woman = scaled_height(
        trimmed_character(CHARACTERS["dog_woman"], "dog_woman"), 345
    )
    bun_seller = scaled_height(
        trimmed_character(CHARACTERS["bun_seller"], "bun_seller"), 448
    )

    # Relative positions follow the supplied placement reference: the candy
    # seller is in the left foreground, the dog and figure sit mid-distance,
    # and the bun seller anchors the right foreground.
    boxes = [
        place_character(scene, candy, 650, 1182),
        place_character(scene, dog_woman, 1428, 1084),
        place_character(scene, bun_seller, 1635, 1186),
    ]

    final = scene.convert("RGB")
    final = ImageEnhance.Contrast(final).enhance(1.012)
    final = final.filter(
        ImageFilter.UnsharpMask(radius=0.55, percent=72, threshold=4)
    )

    # Thin, soft edge falloff gives the illustration a finished cinematic
    # frame and further separates foreground silhouettes.
    overlay = Image.new("RGBA", final.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for inset in range(28):
        alpha = round(25 * (1 - inset / 28) ** 2)
        draw.rectangle(
            (inset, inset, final.width - 1 - inset, final.height - 1 - inset),
            outline=(18, 17, 15, alpha),
            width=1,
        )
    final = Image.alpha_composite(final.convert("RGBA"), overlay).convert("RGB")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    final.save(OUTPUT, format="PNG", optimize=True)
    print(f"saved: {OUTPUT}")
    print(f"boxes: {boxes}")


if __name__ == "__main__":
    compose()
