"""Generate editable transparent NOVA MOD starter packs for both character proportions.

Usage: python -m nova.tools.create_mod_template OUTPUT_DIR --variant chibi
Each PNG is a full-canvas RGBA layer and can be replaced by an artist.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

SLOTS = ("body", "arm_left", "arm_right", "leg_left", "leg_right", "hair_back", "clothes", "head", "eyes", "mouth", "hair_front", "accessory")
SIZES = {"chibi": (512, 512), "adult": (512, 768)}


def create_template(destination, variant):
    if variant not in SIZES:
        raise ValueError("variant must be chibi or adult")
    destination = Path(destination).resolve()
    if destination.exists() and any(destination.iterdir()):
        raise FileExistsError("Template destination must be empty")
    destination.mkdir(parents=True, exist_ok=True)
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
    (destination / "rig.json").write_text(
        json.dumps({"variant": variant, "coordinate_system": "normalized_xy", "joints": joints},
                   indent=2) + "\n", encoding="utf-8"
    )
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destination", type=Path)
    parser.add_argument("--variant", choices=tuple(SIZES), required=True)
    args = parser.parse_args()
    print(create_template(args.destination, args.variant))
