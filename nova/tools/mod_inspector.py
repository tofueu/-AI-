"""Validate NOVA MOD artwork before animation; never modify source assets."""
import json
from pathlib import Path
from PIL import Image

try:
    from .rig_templates import create_blueprint
except ImportError:
    from rig_templates import create_blueprint


def inspect_mod(directory, fallback_directory=None):
    """Return an actionable report; blank whiteboards are NOT playable characters."""
    root = Path(directory).resolve(strict=True)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    blueprint = create_blueprint(manifest["style"])
    layers = manifest.get("layers")
    if not isinstance(layers, dict) or set(layers) - set(blueprint["slots"]):
        raise ValueError("Invalid MOD layer map")
    fallback = Path(fallback_directory).resolve(strict=True) if fallback_directory else None
    report = {"style": manifest["style"], "ready": False, "slots": {}, "errors": []}
    size = tuple(blueprint["canvas_size"])
    for name, config in blueprint["slots"].items():
        filename = layers.get(name)
        status = "missing"
        if filename is not None:
            if not isinstance(filename, str) or not filename or Path(filename).is_absolute():
                raise ValueError("Invalid path for " + name)
            path = (root / filename).resolve()
            if not path.is_relative_to(root) or path.suffix.lower() != ".png":
                raise ValueError("Unsafe path for " + name)
            if path.is_file():
                with Image.open(path) as im:
                    if im.size != size:
                        status = "wrong_size"
                    else:
                        status = "painted" if im.convert("RGBA").getbbox() else "empty"
        if name in ("top", "bottom") and status != "painted" and fallback:
            asset = (fallback / (name + ".png")).resolve()
            if asset.is_relative_to(fallback) and asset.is_file():
                with Image.open(asset) as im:
                    if im.size == size and im.convert("RGBA").getbbox():
                        status = "fallback"
        report["slots"][name] = status
        if config["required"] and status != "painted":
            report["errors"].append(name + ": required painted artwork missing")
        if name in ("top", "bottom") and status not in ("painted", "fallback"):
            report["errors"].append(name + ": clothing or valid fallback missing")
        if status == "wrong_size":
            report["errors"].append(name + ": canvas size mismatch")
    report["ready"] = not report["errors"]
    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("directory")
    parser.add_argument("--fallback-directory")
    args = parser.parse_args()
    result = inspect_mod(args.directory, args.fallback_directory)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["ready"] else 1)
