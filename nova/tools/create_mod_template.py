"""Generate editable transparent NOVA MOD starter packs for both character proportions.

Usage: python -m nova.tools.create_mod_template OUTPUT_DIR --variant chibi
Each PNG is a full-canvas RGBA layer and can be replaced by an artist.
"""
import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

SLOTS = ("body", "arm_left", "arm_right", "leg_left", "leg_right", "hair_back", "clothes", "head", "eyes", "mouth", "hair_front", "accessory", "full_character")
SIZES = {"chibi": (512, 512), "adult": (512, 768)}


def create_template(destination, variant):
    if variant not in SIZES:
        raise ValueError("variant must be chibi or adult")
    destination = Path(destination)
    # Never reuse an existing folder: failures must not delete user artwork.
    if destination.exists():
        raise FileExistsError("Template destination already exists")
    destination.mkdir(parents=False, exist_ok=False)
    try:
        _write_template(destination, variant)
    except BaseException:
        shutil.rmtree(destination)
        raise
    return destination


def _write_template(destination, variant):
    size = SIZES[variant]
    layers = {}
    for slot in SLOTS:
        name = f"{slot}.png"
        Image.new("RGBA", size, (0, 0, 0, 0)).save(destination / name)
        layers[slot] = name
    # The empty body/clothes layers are intentionally NOT renderable until painted.
    # No fake completed character art is bundled in a blank artist template.
    manifest = {
        "format": "nova-mod-v1",
        "variant": variant,
        "canvas": list(size),
        "layers": layers,
        "require_clothes": True,
        "fallback_clothes": None,
    }
    (destination / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    joints = {
        "head": [0.5, 0.23 if variant == "chibi" else 0.18],
        "neck": [0.5, 0.43 if variant == "chibi" else 0.30],
        "left_shoulder": [0.36, 0.47 if variant == "chibi" else 0.34],
        "right_shoulder": [0.64 if variant == "chibi" else 0.66, 0.47 if variant == "chibi" else 0.34],
        "left_hand": [0.23, 0.67 if variant == "chibi" else 0.58],
        "right_hand": [0.77 if variant == "chibi" else 0.82, 0.67 if variant == "chibi" else 0.58],
        "hip": [0.5, 0.72 if variant == "chibi" else 0.62],
        "left_foot": [0.41, 0.94],
        "right_foot": [0.59, 0.94],
    }
    # Keyframed normalized joint offsets; editable independently of the artwork.
    # Frame zero and the last frame match for a seamless loop.
    motion = {
        "format": "nova-motion-v1",
        "variant": variant,
        "coordinate_system": "normalized_xy_offsets",
        "fps": 12,
        "clips": {
            "idle": [
                {"frame": 0, "offsets": {"head": [0, 0], "left_hand": [0, 0], "right_hand": [0, 0]}},
                {"frame": 6, "offsets": {"head": [0, -0.008], "left_hand": [0, -0.004], "right_hand": [0, -0.004]}},
                {"frame": 12, "offsets": {"head": [0, 0], "left_hand": [0, 0], "right_hand": [0, 0]}},
            ],
            "typing": [
                {"frame": 0, "offsets": {"left_hand": [0, 0], "right_hand": [0, 0]}},
                {"frame": 2, "offsets": {"left_hand": [0, -0.012], "right_hand": [0, 0.006]}},
                {"frame": 4, "offsets": {"left_hand": [0, 0.006], "right_hand": [0, -0.012]}},
                {"frame": 6, "offsets": {"left_hand": [0, 0], "right_hand": [0, 0]}},
            ],
        },
    }
    (destination / "animations.json").write_text(
        json.dumps(motion, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (destination / "rig.json").write_text(
        json.dumps({"variant": variant, "coordinate_system": "normalized_xy", "joints": joints},
                   indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--variant", choices=tuple(SIZES), required=True)
    args = parser.parse_args()
    print(create_template(args.destination, args.variant))
