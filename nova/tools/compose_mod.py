"""NOVA layered MOD compositor. Keeps source PNGs untouched.

A MOD folder contains manifest.json and RGBA layer PNGs. Empty optional layers
are skipped; a transparent clothing layer uses the supplied opaque base outfit.
"""
import json
from pathlib import Path
from PIL import Image

REQUIRED = ("body", "clothing")
OPTIONAL = ("face", "eyes", "hair_back", "hair_front", "hat", "accessory")
SLOTS = REQUIRED + OPTIONAL


def compose(mod_dir, base_outfit, output_path=None):
    root = Path(mod_dir)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    canvas = manifest["canvas"]
    if (not isinstance(canvas, list) or len(canvas) != 2
            or any(type(v) is not int or v <= 0 or v > 4096 for v in canvas)):
        raise ValueError("invalid canvas")
    size = tuple(canvas)
    layers = manifest["layers"]
    slots = [layer["slot"] for layer in layers]
    if len(slots) != len(set(slots)) or set(slots) != set(SLOTS):
        raise ValueError("missing, duplicated, or unknown MOD slots")
    if sorted(layer["order"] for layer in layers) != list(range(len(SLOTS))):
        raise ValueError("invalid layer order")
    images = {}
    for layer in layers:
        slot = layer["slot"]
        filename = layer["file"]
        if filename != slot + ".png":
            raise ValueError("unsafe or mismatched layer path")
        path = root / filename
        with Image.open(path) as source:
            source.load()
            if source.mode != "RGBA" or source.size != size:
                raise ValueError("invalid MOD layer: " + slot)
            images[slot] = source.copy()
    if images["body"].getchannel("A").getbbox() is None:
        raise ValueError("body artwork is required")
    if images["clothing"].getchannel("A").getbbox() is None:
        with Image.open(base_outfit) as source:
            source.load()
            if source.mode != "RGBA" or source.size != size:
                raise ValueError("invalid fallback clothing")
            if source.getchannel("A").getbbox() is None:
                raise ValueError("fallback clothing cannot be empty")
            images["clothing"] = source.copy()
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    for layer in sorted(layers, key=lambda item: item["order"]):
        slot = layer["slot"]
        # Required body and clothing are never hidden by MOD visibility flags.
        if slot not in REQUIRED and not layer.get("visible", True):
            continue
        if images[slot].getchannel("A").getbbox() is None:
            continue
        result = Image.alpha_composite(result, images[slot])
    if output_path is not None:
        output = Path(output_path)
        if output.exists():
            raise FileExistsError(output)
        result.save(output)
    return result
