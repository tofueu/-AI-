"""Validate NOVA artist MOD starter packs before importing or rendering.

Run: python -m nova.tools.validate_mod_template PATH
"""
import argparse
import json
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import SIZES, SLOTS


def validate_template(folder):
    folder = Path(folder).resolve(strict=True)
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    rig = json.loads((folder / "rig.json").read_text(encoding="utf-8"))
    if manifest.get("format") != "nova-mod-v1":
        raise ValueError("Unsupported MOD format")
    variant = manifest.get("variant")
    if variant not in SIZES or manifest.get("canvas") != list(SIZES[variant]):
        raise ValueError("Invalid variant or canvas")
    if manifest.get("require_clothes") is not True:
        raise ValueError("Clothing protection must remain enabled")
    layers = manifest.get("layers")
    if not isinstance(layers, dict) or set(layers) != set(SLOTS):
        raise ValueError("Missing or unexpected layer slots")
    if rig.get("variant") != variant or rig.get("coordinate_system") != "normalized_xy":
        raise ValueError("Rig variant or coordinate system mismatch")
    joints = rig.get("joints")
    required_joints = {"head", "neck", "left_shoulder", "right_shoulder",
                       "left_hand", "right_hand", "hip", "left_foot", "right_foot"}
    if not isinstance(joints, dict) or not required_joints.issubset(joints):
        raise ValueError("Missing rig joints")
    for name, xy in joints.items():
        if (not isinstance(xy, list) or len(xy) != 2
                or any(type(n) not in (float, int) or not 0 <= n <= 1 for n in xy)):
            raise ValueError(f"Invalid joint: {name}")
    for slot, name in layers.items():
        if not isinstance(name, str) or Path(name).name != name or not name.endswith(".png"):
            raise ValueError(f"Unsafe layer path: {slot}")
        path = folder / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Missing or linked layer: {slot}")
        with Image.open(path) as im:
            if im.format != "PNG" or im.mode != "RGBA" or im.size != SIZES[variant]:
                raise ValueError(f"Invalid PNG layer: {slot}")
            im.verify()
    if len(set(layers.values())) != len(layers):
        raise ValueError("Duplicate layer paths")
    return {"variant": variant, "layers": len(layers), "joints": len(joints)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    print(json.dumps(validate_template(args.folder), sort_keys=True))
