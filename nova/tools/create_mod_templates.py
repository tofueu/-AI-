"""Generate editable transparent PNG MOD starter packs for both NOVA rigs.

Usage: python -m nova.tools.create_mod_templates OUTPUT_DIR
Requires Pillow. Does not overwrite existing artwork or claim to produce PSD.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

from nova.tools.mod_slot_resolver import SLOTS

VARIANTS = {"chibi": (512, 512), "adult": (768, 1024)}


def create_templates(destination, *, variants=None):
    """Create transparent, named layers and a manifest; refuse any overwrite."""
    root = Path(destination)
    chosen = tuple(VARIANTS if variants is None else variants)
    if not chosen or len(set(chosen)) != len(chosen):
        raise ValueError("select unique variants")
    if any(name not in VARIANTS for name in chosen):
        raise ValueError("unknown variant")
    # Preflight all paths before writing anything, including symlink targets.
    targets = []
    for name in chosen:
        folder = root / name
        targets.extend(folder / (slot + ".png") for slot in SLOTS)
        targets.append(folder / "manifest.json")
    if any(p.exists() or p.is_symlink() for p in targets):
        raise FileExistsError("template output already exists")
    if root.is_symlink() or any((root / name).is_symlink() for name in chosen):
        raise ValueError("symlink output directory")
    for name in chosen:
        width, height = VARIANTS[name]
        folder = root / name
        folder.mkdir(parents=True, exist_ok=True)
        for slot in SLOTS:
            Image.new("RGBA", (width, height), (0, 0, 0, 0)).save(folder / (slot + ".png"))
        manifest = {
            "format": "nova-mod-template-v1",
            "variant": name,
            "canvas": [width, height],
            "slots_back_to_front": list(SLOTS),
            "layers": {slot: slot + ".png" for slot in SLOTS},
            "notes": "Blank painting guides only. Supply nontransparent official base body/head/top/bottom/shoes at runtime. Joint attachments and animation are separate.",
        }
        (folder / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
    return targets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--variant", choices=tuple(VARIANTS), action="append")
    args = parser.parse_args()
    created = create_templates(args.output_dir, variants=args.variant)
    print(f"Created {len(created)} template files")


if __name__ == "__main__":
    main()
