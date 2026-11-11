"""Load a NOVA character MOD manifest into the existing joint renderer.

Manifest format: {"style":"chibi","layers":{"head":"head.png","top":"top.png"}}.
All paths are relative to the MOD directory; originals are opened read-only.
"""
import json
from pathlib import Path
from PIL import Image

try:
    from .rig_templates import create_blueprint, validate_blueprint
except ImportError:
    from rig_templates import create_blueprint, validate_blueprint


def load_mod(directory, fallback_directory=None):
    """Return (blueprint, ordered renderer parts); reject unsafe asset paths."""
    root = Path(directory).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("MOD root must be a directory")
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Invalid MOD manifest")
    blueprint = create_blueprint(manifest.get("style"))
    validate_blueprint(blueprint)
    layers = manifest.get("layers")
    if not isinstance(layers, dict) or set(layers) - set(blueprint["slots"]):
        raise ValueError("Unknown MOD layer")
    fallback_root = Path(fallback_directory).resolve(strict=True) if fallback_directory else None
    parts = []
    for slot_name, slot in blueprint["slots"].items():
        filename = layers.get(slot_name)
        source_root = root
        if filename is None and slot["fallback"] and fallback_root:
            filename = slot_name + ".png"
            source_root = fallback_root
        if filename is None:
            if slot["required"]:
                raise ValueError("Missing required layer: " + slot_name)
            continue
        if not isinstance(filename, str) or not filename or Path(filename).is_absolute():
            raise ValueError("Invalid layer path")
        target = (source_root / filename).resolve()
        if not target.is_relative_to(source_root) or target.suffix.lower() != ".png":
            raise ValueError("Unsafe layer path")
        if not target.is_file():
            raise FileNotFoundError(target)
        with Image.open(target) as im:
            if im.size != tuple(blueprint["canvas_size"]):
                raise ValueError("Layer canvas mismatch: " + slot_name)
            layer = im.convert("RGBA")
        if layer.getbbox() is None and slot["fallback"] and fallback_root and source_root == root:
            fallback_target = (fallback_root / (slot_name + ".png")).resolve()
            if not fallback_target.is_relative_to(fallback_root):
                raise ValueError("Unsafe fallback path")
            if fallback_target.is_file():
                with Image.open(fallback_target) as fallback_im:
                    if fallback_im.size != tuple(blueprint["canvas_size"]):
                        raise ValueError("Fallback canvas mismatch: " + slot_name)
                    layer = fallback_im.convert("RGBA")
        if layer.getbbox() is None:
            if slot["required"]:
                raise ValueError("Required layer is empty: " + slot_name)
            continue
        parts.append({"image": layer, "joint": slot["joint"],
                      "pivot": tuple(slot["pivot"]), "offset": (0, 0)})
    return blueprint, parts
