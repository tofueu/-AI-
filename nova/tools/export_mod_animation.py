"""Command-line exporter for NOVA MOD rig animations.

Example:
 python -m nova.tools.export_mod_animation ./my_mod ./walk.json ./walk.gif --fps 12
 python -m nova.tools.export_mod_animation ./my_mod ./walk.json ./walk_frames --format png
"""
import argparse
import json
from pathlib import Path

from nova.tools.rig_layer_preview import export_gif, export_png_frames


def export_animation(mod_dir, timeline_file, destination, *, format=None, fps=12):
    """Export an authored timeline without altering source MOD assets."""
    timeline_file = Path(timeline_file)
    with timeline_file.open("r", encoding="utf-8") as handle:
        timeline = json.load(handle)
    if not isinstance(timeline, dict):
        raise ValueError("Timeline JSON must be an object")
    destination = Path(destination)
    output_format = format or ("gif" if destination.suffix.lower() == ".gif" else "png")
    if output_format == "gif":
        if destination.suffix.lower() != ".gif":
            raise ValueError("GIF output destination must end with .gif")
        return export_gif(mod_dir, timeline, destination, fps=fps)
    if output_format == "png":
        return export_png_frames(mod_dir, timeline, destination, fps=fps)
    raise ValueError("format must be gif or png")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export NOVA MOD animation to GIF or PNG frames")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("timeline_json", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--format", choices=("gif", "png"))
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args(argv)
    print(export_animation(args.mod_dir, args.timeline_json, args.destination,
                           format=args.format, fps=args.fps))


if __name__ == "__main__":
    main()
