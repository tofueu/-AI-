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

    base = {layer["slot"]: dict(layer) for layer in base_layers}
    if any(slot not in base or not drawable(base[slot]) for slot in required_slots):
        raise ValueError("base outfit lacks drawable required slots")
    resolved = dict(base)
    for layer in mod_layers:
        slot = layer["slot"]
        candidate = dict(layer)
        if slot in required_slots and not drawable(candidate):
            continue
        resolved[slot] = candidate
    return sorted(resolved.values(), key=lambda layer: (layer.get("order", 0), layer["slot"]))
