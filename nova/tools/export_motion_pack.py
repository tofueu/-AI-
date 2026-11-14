"""Export the four NOVA motion presets without changing source MOD assets.

All files are staged in a fresh output directory. An existing destination is
rejected; failure removes only the newly created destination.
"""
import argparse
import shutil
from pathlib import Path

from nova.tools.export_safety import validate_export_destination

from nova.tools.create_motion_timeline import create_motion_timeline

MOTIONS = ("idle", "wave", "walk", "jump")


def export_motion_pack(mod_dir, destination):
    destination = validate_export_destination(mod_dir, destination)
    destination.mkdir(parents=False, exist_ok=False)
    try:
        for motion in MOTIONS:
            create_motion_timeline(mod_dir, destination / (motion + ".json"), motion)
    except BaseException:
        shutil.rmtree(destination)
        raise
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description="Export NOVA four-motion timeline pack")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args(argv)
    print(export_motion_pack(args.mod_dir, args.destination))


if __name__ == "__main__":
    main()
