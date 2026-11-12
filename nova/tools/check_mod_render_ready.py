"""Determine whether a validated NOVA MOD is ready to render.

Blank artist templates remain valid templates, but are not complete characters.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

from nova.tools.validate_mod_template import validate_template


def check_render_ready(folder):
    folder = Path(folder)
    summary = validate_template(folder)
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    layers = manifest["layers"]
    visible = {}
    for slot, name in layers.items():
        with Image.open(folder / name) as image:
            visible[slot] = image.getchannel("A").getbbox() is not None
    fallback = manifest.get("fallback_clothes")
    fallback_visible = False
    if fallback is not None:
        if not isinstance(fallback, str) or not fallback.endswith(".png") or Path(fallback).name != fallback:
            raise ValueError("Unsafe fallback clothing path")
        path = folder / fallback
        if path.is_symlink() or not path.is_file():
            raise ValueError("Missing fallback clothing")
        with Image.open(path) as image:
            if image.format != "PNG" or image.mode != "RGBA" or image.size != tuple(manifest["canvas"]):
                raise ValueError("Invalid fallback clothing PNG")
            fallback_visible = image.getchannel("A").getbbox() is not None
    reasons = []
    if not visible["body"]:
        reasons.append("body layer is transparent")
    if not (visible["clothes"] or fallback_visible):
        reasons.append("no visible clothing or fallback")
    return {**summary, "render_ready": not reasons,
            "visible_slots": [slot for slot in layers if visible[slot]], "reasons": reasons}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    print(json.dumps(check_render_ready(args.folder), sort_keys=True))
