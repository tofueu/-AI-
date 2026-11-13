"""Build a new NOVA MOD from an existing template and replacement PNG layers.

Never edits the source template or artwork. Usage:
 python -m nova.tools.install_mod_layers TEMPLATE OUTPUT --layer head=art/head.png --layer clothes=art/outfit.png
"""
import argparse
import json
import shutil
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import SLOTS


def install_layers(template_dir, destination, replacements):
    source = Path(template_dir).resolve(strict=True)
    target = Path(destination).absolute()
    if target.exists():
        raise FileExistsError("Destination already exists")
    if not isinstance(replacements, dict) or not replacements:
        raise ValueError("At least one replacement layer is required")
    if set(replacements) - set(SLOTS):
        raise ValueError("Unknown MOD layer")
    manifest_path = source / "manifest.json"
    rig_path = source / "rig.json"
    for path in (manifest_path, rig_path):
        if not path.resolve().is_relative_to(source) or not path.is_file():
            raise ValueError("Unsafe template metadata")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("format") != "nova-mod-v1":
        raise ValueError("Unsupported MOD format")
    size = tuple(manifest["canvas"])
    if len(size) != 2 or any(type(v) is not int or not 1 <= v <= 4096 for v in size):
        raise ValueError("Invalid MOD canvas")
    layers = manifest.get("layers")
    if not isinstance(layers, dict) or set(layers) != set(SLOTS):
        raise ValueError("Invalid MOD slots")
    # Validate everything before creating output, including optional transparent layers.
    prepared = {}
    for slot, artwork in replacements.items():
        path = Path(artwork).resolve(strict=True)
        with Image.open(path) as image:
            if image.format != "PNG" or image.size != size:
                raise ValueError(f"{slot}: expected a {size} PNG")
            prepared[slot] = image.convert("RGBA").copy()
    if target.resolve().is_relative_to(source) or source.is_relative_to(target.resolve()):
        raise ValueError("Output must be separate from template")
    try:
        shutil.copytree(source, target, symlinks=False)
        for slot, image in prepared.items():
            filename = layers[slot]
            if not isinstance(filename, str) or Path(filename).name != filename or not filename.endswith(".png"):
                raise ValueError("Unsafe MOD filename")
            image.save(target / filename, format="PNG")
    except Exception:
        if target.exists():
            shutil.rmtree(target)
        raise
    return target


def main(argv=None):
    parser = argparse.ArgumentParser(description="Create a new NOVA MOD with replacement PNG layers")
    parser.add_argument("template", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--layer", action="append", required=True, metavar="SLOT=PNG")
    args = parser.parse_args(argv)
    entries = {}
    for item in args.layer:
        slot, separator, path = item.partition("=")
        if not separator or not path or slot in entries:
            parser.error("Each --layer must be a unique SLOT=PNG")
        entries[slot] = path
    print(install_layers(args.template, args.destination, entries))


if __name__ == "__main__":
    main()
