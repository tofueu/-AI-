"""Generate editable, transparent NOVA MOD starter sheets (not finished character art).

Run: python -m nova.tools.make_mod_templates OUTPUT_DIR
Requires Pillow. Never overwrites existing user artwork.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

SLOTS = ("body", "clothing", "face", "eyes", "hair_back", "hair_front", "hat", "accessory")
PROFILES = {
    "chibi": {"canvas": [512, 512], "joints": {"root": [256, 365], "neck": [256, 218], "head": [256, 145], "left_hand": [145, 330], "right_hand": [367, 330], "left_foot": [216, 450], "right_foot": [296, 450]}},
    "adult": {"canvas": [512, 768], "joints": {"root": [256, 570], "neck": [256, 205], "head": [256, 125], "left_hand": [130, 410], "right_hand": [382, 410], "left_foot": [220, 705], "right_foot": [292, 705]}},
}

def generate(destination):
    destination = Path(destination)
    outputs = []
    # An existing profile directory may contain unrecognized user art or a MOD.
    # Never write into it, even when the expected template filenames are absent.
    for profile in PROFILES:
        root = destination / profile
        if root.exists() or root.is_symlink():
            raise FileExistsError(f"template profile directory already exists: {root}")
    for profile, spec in PROFILES.items():
        root = destination / profile
        files = [root / (slot + ".png") for slot in SLOTS]
        manifest_path = root / "manifest.json"
        # Refuse partial updates too: existing artwork and manifests remain untouched.
        if any(path.exists() for path in files + [manifest_path]):
            raise FileExistsError(f"template already exists: {root}")
        root.mkdir(parents=True, exist_ok=True)
        for path in files:
            Image.new("RGBA", tuple(spec["canvas"]), (0, 0, 0, 0)).save(path)
            outputs.append(path)
        manifest = {
            "schema_version": 1, "profile": profile, "canvas": spec["canvas"],
            "joints": spec["joints"],
            "layers": [
                {"slot": slot, "file": slot + ".png", "order": i,
                 "visible": slot in ("body", "clothing")}
                for i, slot in enumerate(SLOTS)
            ],
            "note": "Blank authoring template only. Paint body and clothing before rendering; required layers cannot remain transparent."
        }
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        outputs.append(manifest_path)
    return outputs

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir")
    args = parser.parse_args()
    for path in generate(args.output_dir):
        print(path)

if __name__ == "__main__":
    main()
