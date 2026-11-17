"""Generate a review contact sheet from a NOVA PNG animation export.

This is an inspection aid, not approved character artwork. It never changes
source frames or overwrites an existing destination.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw


def export_contact_sheet(sequence_dir, output_path, *, columns=4, thumb_size=(192, 192)):
    """Validate a sequence manifest and export a labeled RGBA contact sheet."""
    if type(columns) is not int or not 1 <= columns <= 32:
        raise ValueError("columns must be between 1 and 32")
    if (not isinstance(thumb_size, tuple) or len(thumb_size) != 2 or
            any(type(v) is not int or not 1 <= v <= 1024 for v in thumb_size)):
        raise ValueError("invalid thumbnail size")
    directory = Path(sequence_dir)
    if directory.is_symlink() or (directory / "manifest.json").is_symlink():
        raise ValueError("symlinked sequence directory or manifest is forbidden")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    names = manifest["frames"]
    if not isinstance(names, list) or not names:
        raise ValueError("manifest has no frames")
    if not isinstance(manifest.get("canvas"), list) or len(manifest["canvas"]) != 2:
        raise ValueError("invalid manifest canvas")
    # Validate bounds before opening any frames or allocating the output.
    canvas = manifest["canvas"]
    if any(type(v) is not int or not 1 <= v <= 4096 for v in canvas):
        raise ValueError("invalid manifest canvas dimensions")
    if len(names) > 256 or len(set(names)) != len(names):
        raise ValueError("too many or duplicate animation frames")
    w, h = thumb_size
    rows = (len(names) + columns - 1) // columns
    if columns * w * rows * (h + 24) > 64_000_000:
        raise ValueError("contact sheet exceeds pixel limit")
    frames = []
    for name in names:
        if (not isinstance(name, str) or not name.startswith("frame_") or
                not name.endswith(".png") or Path(name).name != name):
            raise ValueError("invalid frame name")
        frame_path = directory / name
        if frame_path.is_symlink():
            raise ValueError("symlinked frame is forbidden")
        with Image.open(frame_path) as source:
            if source.mode != "RGBA" or list(source.size) != manifest["canvas"]:
                raise ValueError("frame does not match RGBA manifest canvas")
            frames.append(source.copy())
    sheet = Image.new("RGBA", (columns * w, rows * (h + 24)), (240, 240, 240, 255))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x, y = (index % columns) * w, (index // columns) * (h + 24)
        checker = Image.new("RGBA", (w, h), (236, 236, 236, 255))
        checks = ImageDraw.Draw(checker)
        for cy in range(0, h, 16):
            for cx in range(0, w, 16):
                if (cx // 16 + cy // 16) % 2:
                    checks.rectangle((cx, cy, min(cx + 15, w - 1), min(cy + 15, h - 1)),
                                     fill=(200, 200, 200, 255))
        preview = frame.copy()
        preview.thumbnail((w, h), Image.Resampling.LANCZOS)
        checker.alpha_composite(preview, ((w - preview.width) // 2, (h - preview.height) // 2))
        sheet.alpha_composite(checker, (x, y))
        draw.text((x + 6, y + h + 4), f"{index:04d}", fill=(30, 30, 30, 255))
    output = Path(output_path)
    if output.is_symlink():
        raise ValueError("symlinked output is forbidden")
    with output.open("xb") as handle:
        try:
            sheet.save(handle, format="PNG")
        except BaseException:
            handle.close()
            output.unlink(missing_ok=True)
            raise
    return output
