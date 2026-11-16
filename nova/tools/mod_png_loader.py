"""Load NOVA slot PNGs from an unpacked MOD directory.

Only known flat slot filenames are read; source files are never modified.
"""
from pathlib import Path
from PIL import Image
from nova.tools.mod_slot_resolver import SLOTS


def load_mod_png_slots(directory, canvas):
    """Return RGBA slot images for optional MOD layers.

    Missing slots remain absent so the resolver can apply official defaults.
    Reject invalid image formats and dimensions rather than resizing artwork.
    """
    root = Path(directory)
    if not root.is_dir():
        raise ValueError("MOD directory does not exist")
    if (not isinstance(canvas, tuple) or len(canvas) != 2 or
            any(type(n) is not int or not 1 <= n <= 4096 for n in canvas)):
        raise ValueError("invalid canvas")
    result = {}
    for slot in SLOTS:
        path = root / (slot + ".png")
        if path.is_symlink():
            raise ValueError("symlinked MOD layers are not supported")
        if not path.exists():
            continue
        if not path.is_file():
            raise ValueError("MOD slot must be a file: " + slot)
        with Image.open(path) as image:
            if image.format != "PNG" or image.mode != "RGBA" or image.size != canvas:
                raise ValueError("MOD slot must be matching RGBA PNG: " + slot)
            image.load()
            result[slot] = image.copy()
    return result
