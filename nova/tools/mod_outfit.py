"""Resolve slot-based MOD overlays with mandatory base outfit fallback."""


def resolve_outfit(base_layers, mod_layers, required_slots=("body", "clothing")):
    """Retain visible base body/clothing when a MOD hides mandatory slots.

    File existence and nontransparent pixels must be checked by the renderer.
    """
    base = {layer["slot"]: dict(layer) for layer in base_layers}
    if any(slot not in base or not base[slot].get("visible", True) for slot in required_slots):
        raise ValueError("base outfit lacks required visible slots")
    resolved = dict(base)
    for layer in mod_layers:
        slot = layer["slot"]
        candidate = dict(layer)
        if slot in required_slots and not candidate.get("visible", True):
            continue
        resolved[slot] = candidate
    for slot in required_slots:
        if not resolved[slot].get("visible", True):
            resolved[slot] = base[slot]
    return sorted(resolved.values(), key=lambda layer: (layer.get("order", 0), layer["slot"]))
