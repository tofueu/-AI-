"""Generate editable, transparent NOVA MOD starter sheets (not finished character art).

Run: python -m nova.tools.make_mod_templates OUTPUT_DIR
Requires Pillow. Never overwrites existing user artwork.
"""
import argparse
import json
import shutil
import tempfile
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
    # Build both profiles off-destination. A failed image write must not
    # leave one usable-looking profile beside a half-written second profile.
    destination.mkdir(parents=True, exist_ok=True)
    staged = Path(tempfile.mkdtemp(prefix=".nova-templates-", dir=destination))
    installed = []
    try:
        for profile, spec in PROFILES.items():
            root = staged / profile
            root.mkdir()
            for slot in SLOTS:
                Image.new("RGBA", tuple(spec["canvas"]), (0, 0, 0, 0)).save(root / (slot + ".png"))
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
            (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "
", encoding="utf-8")
        # Validate staged artifacts before publishing either profile.
        for profile, spec in PROFILES.items():
            root = staged / profile
            manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
            if manifest["profile"] != profile or manifest["canvas"] != spec["canvas"]:
                raise ValueError(f"invalid staged template manifest: {profile}")
            if manifest.get("joints") != spec["joints"]:
                raise ValueError(f"invalid staged template joints: {profile}")
            if [layer["slot"] for layer in manifest["layers"]] != list(SLOTS):
                raise ValueError(f"invalid staged template layers: {profile}")
            if [layer["order"] for layer in manifest["layers"]] != list(range(len(SLOTS))):
                raise ValueError(f"invalid staged template layer order: {profile}")
            for slot in SLOTS:
                with Image.open(root / (slot + ".png")) as image:
                    image.verify()
                with Image.open(root / (slot + ".png")) as image:
                    if image.mode != "RGBA" or image.size != tuple(spec["canvas"]):
                        raise ValueError(f"invalid staged PNG: {profile}/{slot}")
                    if image.getchannel("A").getbbox() is not None:
                        raise ValueError(f"nontransparent starter layer: {profile}/{slot}")
        # Recheck before installing in case another process created a profile.
        for profile in PROFILES:
            target = destination / profile
            if target.exists() or target.is_symlink():
                raise FileExistsError(f"template profile directory already exists: {target}")
        for profile in PROFILES:
            target = destination / profile
            (staged / profile).rename(target)
            installed.append(target)
            outputs.extend(target / (slot + ".png") for slot in SLOTS)
            outputs.append(target / "manifest.json")
    except Exception:
        for target in reversed(installed):
            shutil.rmtree(target)
        raise
    finally:
        shutil.rmtree(staged, ignore_errors=True)
    return outputs

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir")
    args = parser.parse_args()
    for path in generate(args.output_dir):
        print(path)

if __name__ == "__main__":
    main()
