"""Resolve slot-based MOD overlays with mandatory opaque base outfit fallback."""
from pathlib import Path


def resolve_outfit(base_layers, mod_layers, required_slots=("body", "clothing"), source_dir=None):
    """Merge MOD slots, falling back when a mandatory overlay is hidden or empty.

    When source_dir is supplied, mandatory base and overlay images are validated
    for safe paths and nontransparent pixels before selecting an outfit.
    Neither input list nor the source image files are modified.
    """
    def drawable(layer):
        if not layer.get("visible", True):
            return False
        if source_dir is None:
            return True
        from PIL import Image
        root = Path(source_dir).resolve()
        relative = layer.get("file")
        if not isinstance(relative, str) or not relative:
            return False
        path = (root / relative).resolve()
        if root not in path.parents or not path.is_file():
            return False
        try:
            with Image.open(path) as image:
                return image.convert("RGBA").getchannel("A").getbbox() is not None
        except (OSError, ValueError):
            return False

    base = {}
    for layer in base_layers:
        slot = layer["slot"]
        if slot in base:
            raise ValueError(f"duplicate base slot: {slot}")
        base[slot] = dict(layer)
    if any(slot not in base or not drawable(base[slot]) for slot in required_slots):
        raise ValueError("base outfit lacks drawable required slots")
    resolved = dict(base)
    seen_mod_slots = set()
    for layer in mod_layers:
        slot = layer["slot"]
        if slot in seen_mod_slots:
            raise ValueError(f"duplicate MOD slot: {slot}")
        seen_mod_slots.add(slot)
        candidate = {**base.get(slot, {}), **layer}
        if slot in required_slots and not drawable(candidate):
            continue
        if slot not in required_slots and source_dir is not None and not drawable(candidate):
            # Keep the slot for rig/order compatibility, but never draw an empty asset.
            candidate["visible"] = False
        resolved[slot] = candidate
    return sorted(resolved.values(), key=lambda layer: (layer.get("order", 0), layer["slot"]))
