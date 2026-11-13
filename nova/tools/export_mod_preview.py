"""Command-line entry point for NOVA MOD animation previews.

Example:
 python -m nova.tools.export_mod_preview ./my_mod ./walk.json ./walk.gif
 python -m nova.tools.export_mod_preview ./my_mod ./walk.json ./frames --format png
"""
import argparse
import json
from pathlib import Path

from nova.tools.rig_layer_preview import export_gif, export_png_frames


def export_preview(mod_dir, timeline_file, destination, *, fmt="gif", fps=12):
    """Read a timeline and export without overwriting existing user files."""
    timeline_path = Path(timeline_file)
    if not timeline_path.is_file():
        raise FileNotFoundError(timeline_path)
    timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
    if not isinstance(timeline, dict):
        raise ValueError("Timeline must be a JSON object")
    if fmt == "gif":
        if Path(destination).suffix.lower() != ".gif":
            raise ValueError("GIF destination must end in .gif")
        return export_gif(mod_dir, timeline, destination, fps=fps)
    if fmt == "png":
        return export_png_frames(mod_dir, timeline, destination, fps=fps)
    raise ValueError("format must be gif or png")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export NOVA MOD rigid-layer animation previews")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("timeline", type=Path, help="JSON keyframe timeline")
    parser.add_argument("destination", type=Path)
    parser.add_argument("--format", choices=("gif", "png"), default="gif")
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args(argv)
    print(export_preview(args.mod_dir, args.timeline, args.destination,
                         fmt=args.format, fps=args.fps))


if __name__ == "__main__":
    main()
