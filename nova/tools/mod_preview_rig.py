"""Static PNG preview for current NOVA manifest.json / 14-slot rig MODs."""
from pathlib import Path
from PIL import Image
try:
    from .mod_loader import load_mod
except ImportError:
    from mod_loader import load_mod

# Back-to-front painter order; the manifest order must not cover the face
# with back hair or put the torso behind the clothing.
PAINT_ORDER = (
    "back_hair", "left_leg", "right_leg", "body", "bottom",
    "left_arm", "right_arm", "top", "head", "eyes", "mouth",
    "front_hair", "hat", "accessory",
)


def export_mod_preview(mod_directory, destination, fallback_directory=None):
    """Composite painted layers without modifying original MOD PNGs."""
    output = Path(destination)
    if output.exists():
        raise FileExistsError(output)
    if output.suffix.lower() != ".png":
        raise ValueError("Destination must be PNG")
    blueprint, parts = load_mod(mod_directory, fallback_directory)
    canvas = Image.new("RGBA", tuple(blueprint["canvas_size"]), (0, 0, 0, 0))
    layer_order = {slot: index for index, slot in enumerate(PAINT_ORDER)}
    for part in sorted(parts, key=lambda part: layer_order[part["slot"]]):
        canvas.alpha_composite(part["image"])
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as handle:
        canvas.save(handle, format="PNG")
    return output
