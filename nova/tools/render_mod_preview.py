"""Composite a NOVA MOD preview with mandatory base clothing fallback.

This renders a static preview, not a finished animated character.
"""
from pathlib import Path

from PIL import Image

from nova.tools.mod_slot_resolver import SLOTS, resolve_mod_layers


def render_preview(base, mod=None, *, canvas, visibility=None):
    """Return a new RGBA image; never mutate supplied layers."""
    layers, visible = resolve_mod_layers(base, mod, canvas=canvas, visibility=visibility)
    result = Image.new("RGBA", canvas, (0, 0, 0, 0))
    for slot in SLOTS:
        if visible.get(slot):
            result.alpha_composite(layers[slot])
    return result


def export_preview(destination, base, mod=None, *, canvas, visibility=None):
    """Write a PNG without overwriting any existing file or following symlinks."""
    destination = Path(destination)
    if destination.suffix.lower() != ".png":
        raise ValueError("preview destination must be a PNG")
    if any(parent.is_symlink() for parent in (destination, *destination.parents)):
        raise ValueError("symlink in preview destination ancestry")
    preview = render_preview(base, mod, canvas=canvas, visibility=visibility)
    # Exclusive create prevents accidental overwrite, including an existing symlink.
    with destination.open("xb") as output:
        try:
            preview.save(output, format="PNG")
        except BaseException:
            output.close()
            destination.unlink(missing_ok=True)
            raise
    return destination
