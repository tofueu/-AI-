"""Resolve replaceable NOVA MOD slots without modifying source artwork."""
from PIL import Image

SLOTS = ("body", "head", "eyes", "mouth", "hair", "hat", "top", "bottom", "shoes", "accessory")
CLOTHING = ("top", "bottom", "shoes")
REQUIRED = ("body", "head", *CLOTHING)


def resolve_mod_layers(base, mod=None, *, canvas, visibility=None):
    """Return ordered RGBA slot images and visibility with base-clothing fallback."""
    if (not isinstance(canvas, tuple) or len(canvas) != 2 or
            any(type(v) is not int or not 1 <= v <= 4096 for v in canvas)):
        raise ValueError("invalid canvas")
    mod = {} if mod is None else mod
    visibility = {} if visibility is None else visibility
    if not all(isinstance(d, dict) for d in (base, mod, visibility)):
        raise TypeError("base, mod and visibility must be dictionaries")
    if (set(base) | set(mod) | set(visibility)) - set(SLOTS):
        raise ValueError("unknown MOD slot")
    if any(type(v) is not bool for v in visibility.values()):
        raise ValueError("visibility values must be booleans")
    for name, layer in list(base.items()) + list(mod.items()):
        if not isinstance(layer, Image.Image) or layer.mode != "RGBA" or layer.size != canvas:
            raise ValueError(f"{name} must be a full-canvas RGBA image")
    if not set(REQUIRED).issubset(base):
        raise ValueError("official base must provide body, head and basic clothing")
    # Transparent replacements must not erase mandatory body or clothing layers.
    # Reject an unusable official base rather than exporting an invisible pet.
    for slot in REQUIRED:
        if base[slot].getchannel("A").getbbox() is None:
            raise ValueError(f"official base {slot} must not be fully transparent")
    layers, visible = {}, {}
    for slot in SLOTS:
        candidate = mod.get(slot)
        if slot in REQUIRED and (candidate is None or candidate.getchannel("A").getbbox() is None):
            candidate = base[slot]
        if candidate is None:
            candidate = base.get(slot)
        if candidate is None:
            continue
        # Keep official clothing beneath partially transparent MOD artwork.\n        # This prevents cutouts in a replacement from exposing an undressed pet.\n        if slot in CLOTHING and candidate is not base[slot]:\n            composed = base[slot].copy()\n            composed.alpha_composite(candidate)\n            candidate = composed\n        layers[slot] = candidate.copy()
        nonempty = candidate.getchannel("A").getbbox() is not None
        visible[slot] = nonempty and (slot in REQUIRED or visibility.get(slot, True))
    return layers, visible
