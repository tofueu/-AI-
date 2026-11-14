"""Render all four NOVA motion presets into preview GIFs or PNG sequences.

These are rigid-layer previews, not finished character art. Source MOD assets
are read-only; a failed export removes only its newly created output folder.
"""
import argparse
import json
import shutil
from pathlib import Path

from nova.tools.export_safety import validate_export_destination

from nova.tools.create_motion_timeline import create_motion_timeline
from nova.tools.export_motion_pack import MOTIONS
from nova.tools.rig_layer_preview import export_gif, export_png_frames


def render_motion_pack(mod_dir, destination, *, format="gif", fps=12):
    if format not in ("gif", "png"):
        raise ValueError("format must be gif or png")
    if type(fps) is not int or not 1 <= fps <= 60:
        raise ValueError("fps must be an integer from 1 to 60")
    destination = validate_export_destination(mod_dir, destination)
    destination.mkdir(parents=False, exist_ok=False)
    try:
        for motion in MOTIONS:
            timeline_path = destination / (motion + ".json")
            create_motion_timeline(mod_dir, timeline_path, motion)
            timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
            if format == "gif":
                export_gif(mod_dir, timeline, destination / (motion + ".gif"), fps=fps)
            else:
                export_png_frames(mod_dir, timeline, destination / motion, fps=fps)
        return destination
    except BaseException:
        shutil.rmtree(destination)
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description="Render four NOVA motion previews")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--format", choices=("gif", "png"), default="gif")
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args(argv)
    print(render_motion_pack(args.mod_dir, args.destination,
                             format=args.format, fps=args.fps))


if __name__ == "__main__":
    main()
