"""Static PNG preview for current NOVA manifest.json / 14-slot rig MODs."""
from pathlib import Path
from PIL import Image
try:
    from .mod_loader import load_mod
except ImportError:
    from mod_loader import load_mod

def export_mod_preview(mod_directory, destination, fallback_directory=None):
    """Composite painted layers without modifying original MOD PNGs."""
    output = Path(destination)
    if output.exists():
        raise FileExistsError(output)
    if output.suffix.lower() != ".png":
        raise ValueError("Destination must be PNG")
    blueprint, parts = load_mod(mod_directory, fallback_directory)
    canvas = Image.new("RGBA", tuple(blueprint["canvas_size"]), (0, 0, 0, 0))
    for part in parts:
        canvas.alpha_composite(part["image"])
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as handle:
        canvas.save(handle, format="PNG")
    return output
