"""Render a transparent, non-destructive joint-placement guide for NOVA artists.

Usage: python -m nova.tools.export_rig_guide MOD_DIR guide.png
The guide is reference art only; it is never installed as a character layer.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BONES = (
    ("head", "neck"), ("neck", "left_shoulder"), ("neck", "right_shoulder"),
    ("left_shoulder", "left_hand"), ("right_shoulder", "right_hand"),
    ("neck", "hip"), ("hip", "left_foot"), ("hip", "right_foot"),
)


def export_rig_guide(mod_dir, destination):
    root = Path(mod_dir).resolve(strict=True)
    destination = Path(destination).absolute()
    if destination.exists():
        raise FileExistsError("Guide destination already exists")
    if destination.suffix.lower() != ".png":
        raise ValueError("Guide destination must be PNG")
    if destination.resolve().is_relative_to(root):
        raise ValueError("Guide must be outside the source MOD")
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
    canvas = manifest.get("canvas")
    if (not isinstance(canvas, list) or len(canvas) != 2
            or any(type(n) is not int or not 1 <= n <= 4096 for n in canvas)):
        raise ValueError("Invalid canvas")
    if rig.get("coordinate_system") != "normalized_xy":
        raise ValueError("Unsupported rig coordinates")
    joints = rig.get("joints")
    if not isinstance(joints, dict) or any(name not in joints for bone in BONES for name in bone):
        raise ValueError("Missing required rig joints")
    points = {}
    width, height = canvas
    for name, point in joints.items():
        if (not isinstance(point, list) or len(point) != 2
                or any(type(v) not in (int, float) or not 0 <= v <= 1 for v in point)):
            raise ValueError("Invalid joint coordinates")
        points[name] = (round(point[0] * (width - 1)), round(point[1] * (height - 1)))
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    thickness = max(2, width // 128)
    for a, b in BONES:
        draw.line((points[a], points[b]), fill=(80, 180, 255, 200), width=thickness)
    radius = max(4, width // 80)
    for name, (x, y) in points.items():
        draw.ellipse((x-radius, y-radius, x+radius, y+radius),
                     fill=(255, 200, 50, 230), outline=(20, 20, 20, 255), width=2)
        draw.text((min(width-1, x+radius+3), max(0, y-radius)), name,
                  fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(0, 0, 0, 255))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as handle:
        image.save(handle, format="PNG")
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export NOVA skeleton placement guide")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args(argv)
    print(export_rig_guide(args.mod_dir, args.destination))


if __name__ == "__main__":
    main()
