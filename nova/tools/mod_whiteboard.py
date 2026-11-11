"""Generate editable, transparent NOVA PNG whiteboard packs without touching original art.

Each style gets one full-canvas PNG per slot, a rig blueprint and a manifest.
Blank packs are drawing templates, not playable MODs until body/head are painted.
"""
import json
from pathlib import Path
from PIL import Image

try:
    from .rig_templates import create_blueprint
except ImportError:
    from rig_templates import create_blueprint


def create_whiteboard(destination, style):
    """Create a new style-specific whiteboard directory; never overwrite files."""
    blueprint = create_blueprint(style)
    target = Path(destination)
    if target.exists():
        raise FileExistsError(target)
    target.mkdir(parents=True, exist_ok=False)
    try:
        size = tuple(blueprint["canvas_size"])
        layers = {}
        for slot in blueprint["slots"]:
            filename = slot + ".png"
            Image.new("RGBA", size, (0, 0, 0, 0)).save(target / filename)
            layers[slot] = filename
        (target / "manifest.json").write_text(
            json.dumps({"style": style, "layers": layers}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (target / "blueprint.json").write_text(
            json.dumps(blueprint, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (target / "README.txt").write_text(
            "NOVA blank art template. Paint body.png and head.png before importing.\n"
            "Keep each PNG at its original canvas dimensions and preserve transparency.\n"
            "Other layers are optional; empty layers are hidden by the MOD loader.\n"
            "For clothing safety, supply top.png and bottom.png or configured fallback assets.\n"
            "This pack is PNG-only; it does not claim to contain a layered PSD.\n",
            encoding="utf-8",
        )
    except Exception:
        import shutil
        shutil.rmtree(target)
        raise
    return target


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Create a NOVA transparent PNG whiteboard")
    parser.add_argument("destination")
    parser.add_argument("--style", choices=("chibi", "adult"), required=True)
    args = parser.parse_args()
    print(create_whiteboard(args.destination, args.style))
