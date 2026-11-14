"""Validate NOVA artist MOD packs without changing source files.

Usage: python -m nova.tools.validate_mod_pack PATH
Exit 0 only when a pack contains renderable body and clothing artwork.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import SIZES, SLOTS


def validate_pack(folder):
    folder = Path(folder)
    errors = []
    try:
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return {"ready": False, "errors": [f"manifest: {exc}"], "visible_layers": []}
    variant = manifest.get("variant")
    size = SIZES.get(variant)
    if size is None:
        errors.append("unsupported variant")
    if manifest.get("format") != "nova-mod-v1":
        errors.append("unsupported manifest format")
    if size and manifest.get("canvas") != list(size):
        errors.append("canvas mismatch")
    layers = manifest.get("layers")
    if not isinstance(layers, dict):
        return {"ready": False, "errors": errors + ["layers must be an object"], "visible_layers": []}
    visible = []
    for slot, name in layers.items():
        if slot not in SLOTS:
            errors.append(f"unknown slot: {slot}")
            continue
        if not isinstance(name, str) or not name or Path(name).name != name or name in (".", ".."):
            errors.append(f"unsafe layer path: {slot}")
            continue
        path = folder / name
        if path.is_symlink():
            errors.append(f"symlink layer forbidden: {slot}")
            continue
        try:
            with Image.open(path) as im:
                if im.format != "PNG" or im.mode != "RGBA" or (size and im.size != size):
                    errors.append(f"invalid PNG dimensions or format: {slot}")
                elif im.getchannel("A").getbbox() is not None:
                    visible.append(slot)
        except (OSError, ValueError) as exc:
            errors.append(f"unreadable layer {slot}: {exc}")
    if not any(slot in visible for slot in ("body", "full_character")):
        errors.append("body/full_character artwork missing")
    if manifest.get("require_clothes", True) and "clothes" not in visible:
        fallback = manifest.get("fallback_clothes")
        if not isinstance(fallback, str) or not fallback or Path(fallback).name != fallback:
            errors.append("visible clothing or safe fallback required")
        else:
            path = folder / fallback
            if path.is_symlink():
                errors.append("fallback symlink forbidden")
            else:
                try:
                    with Image.open(path) as im:
                        if im.format != "PNG" or im.mode != "RGBA" or im.size != size or im.getchannel("A").getbbox() is None:
                            errors.append("fallback clothing is empty or invalid")
                except (OSError, ValueError):
                    errors.append("fallback clothing missing")
    return {"ready": not errors, "errors": errors, "visible_layers": visible}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    result = validate_pack(args.folder)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
