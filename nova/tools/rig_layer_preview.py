"""Render NOVA MOD PNG layers with joint-driven translation into animated frames.

This is a rigid-layer preview, not skinning or a finished character animation.
"""
from pathlib import Path
import json
from PIL import Image
from nova.tools.rig_timeline import sample_pose

SLOT_JOINTS = {
    "body": "hip", "hair_back": "head", "clothes": "hip",
    "head": "head", "eyes": "head", "mouth": "head",
    "hair_front": "head", "accessory": "head",
}
ORDER = ("body", "hair_back", "clothes", "head", "eyes", "mouth", "hair_front", "accessory")


def render_frames(mod_dir, timeline, fps=12):
    """Return RGBA PIL frames; do not modify the MOD source images."""
    if type(fps) is not int or not 1 <= fps <= 60:
        raise ValueError("fps must be an integer from 1 to 60")
    root = Path(mod_dir).resolve()
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
    width, height = manifest["canvas"]
    if type(width) is not int or type(height) is not int or not 1 <= width <= 4096 or not 1 <= height <= 4096:
        raise ValueError("Invalid canvas")
    layers = manifest["layers"]
    if not isinstance(layers, dict):
        raise ValueError("Invalid layers")
    images = {}
    for slot in ORDER:
        name = layers.get(slot)
        if name is None:
            continue
        if not isinstance(name, str) or not name.endswith(".png"):
            raise ValueError("Invalid layer filename")
        candidate = (root / name).resolve()
        if not candidate.is_relative_to(root) or not candidate.is_file():
            raise ValueError("Layer must be a PNG inside MOD directory")
        with Image.open(candidate) as source:
            if source.size != (width, height):
                raise ValueError("Layer size does not match canvas")
            images[slot] = source.convert("RGBA")
    duration = timeline["duration_ms"]
    if type(duration) not in (int, float) or not 0 < duration <= 60000:
        raise ValueError("Invalid duration")
    count = max(1, round(duration * fps / 1000))
    if count > 3600:
        raise ValueError("Too many frames")
    base = {key: value[:] for key, value in rig["joints"].items()}
    output = []
    for index in range(count):
        pose = sample_pose(rig, timeline, index * duration / count)
        frame = Image.new("RGBA", (width, height))
        for slot in ORDER:
            if slot not in images:
                continue
            joint = SLOT_JOINTS[slot]
            if joint not in pose or joint not in base:
                raise ValueError("Missing joint: " + joint)
            dx = round((pose[joint][0] - base[joint][0]) * width)
            dy = round((pose[joint][1] - base[joint][1]) * height)
            shifted = Image.new("RGBA", (width, height))
            shifted.paste(images[slot], (dx, dy))
            frame = Image.alpha_composite(frame, shifted)
        output.append(frame)
    return output


def export_gif(mod_dir, timeline, output_path, fps=12):
    """Export a preview GIF atomically without overwriting an existing file.

    A failed encoder leaves no partial destination. The temporary file stays
    in the destination directory so the final hard link is on one filesystem.
    """
    import os
    import tempfile

    frames = render_frames(mod_dir, timeline, fps)
    target = Path(output_path)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".gif", prefix=".nova-preview-",
            dir=target.parent, delete=False
        ) as handle:
            temporary = Path(handle.name)
        frames[0].save(
            temporary, format="GIF", save_all=True,
            append_images=frames[1:], duration=round(1000 / fps),
            loop=0, disposal=2, transparency=0
        )
        # os.link fails with FileExistsError if target already exists.
        # Unlike replace/rename, it never overwrites user files.
        os.link(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return target
