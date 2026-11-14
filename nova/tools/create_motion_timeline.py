"""Generate a reusable, rig-relative NOVA idle/wave/walk/jump timeline (not finished art).

Usage: python -m nova.tools.create_motion_timeline MOD_DIR OUTPUT.json --motion wave
The source MOD and rig are read-only; existing output files are never replaced.
"""
import argparse
import json
import math
import os
from pathlib import Path


def create_motion_timeline(mod_dir, destination, motion="wave"):
    if motion not in ("wave", "idle", "walk", "jump"):
        raise ValueError("motion must be wave, idle, walk or jump")
    root = Path(mod_dir).resolve()
    rig_path = (root / "rig.json").resolve()
    if not rig_path.is_relative_to(root) or not rig_path.is_file():
        raise ValueError("rig.json must be inside MOD directory")
    rig = json.loads(rig_path.read_text(encoding="utf-8"))
    if not isinstance(rig, dict) or not isinstance(rig.get("joints"), dict):
        raise ValueError("rig.json must contain a joints object")
    joints = rig["joints"]
    for key in ("head", "hip", "right_hand", "left_hand", "left_foot", "right_foot"):
        point = joints.get(key)
        if not isinstance(point, list) or len(point) != 2 or any(
            type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in point
        ):
            raise ValueError("Invalid rig joint: " + key)
    frames = []
    # End pose matches the beginning to avoid a visible jump when looping.
    for index in range(9):
        phase = index * math.pi / 4
        bob = -0.012 * (1 - math.cos(phase))
        offsets = {"head": [0, bob], "hip": [0, bob / 2]}
        if motion == "wave":
            offsets["right_hand"] = [
                -0.06 * math.sin(phase),
                -0.10 * (1 - math.cos(phase)) / 2,
            ]
        elif motion == "walk":
            # Opposite foot/hand phases create a cyclic, in-place walk preview.
            # These are translations only; no joint rotation or skinning.
            stride = 0.025 * math.sin(phase)
            lift_left = -0.018 * max(0, math.cos(phase))
            lift_right = -0.018 * max(0, -math.cos(phase))
            offsets["left_foot"] = [stride, lift_left]
            offsets["right_foot"] = [-stride, lift_right]
            offsets["left_hand"] = [-stride * 0.7, 0]
            offsets["right_hand"] = [stride * 0.7, 0]
        elif motion == "jump":
            # Crouch, lift and land with both feet synchronized.
            height = -0.045 * max(0, math.sin(phase / 2))
            offsets["hip"] = [0, height]
            offsets["head"] = [0, height + bob]
            offsets["left_foot"] = [0, height]
            offsets["right_foot"] = [0, height]
            offsets["left_hand"] = [-0.015 * math.sin(phase / 2), height]
            offsets["right_hand"] = [0.015 * math.sin(phase / 2), height]
        frames.append({
            "time_ms": index * 250,
            "joints": {
                name: [round(joints[name][0] + delta[0], 6),
                       round(joints[name][1] + delta[1], 6)]
                for name, delta in offsets.items()
            },
        })
    timeline = {"duration_ms": 2000, "frames": frames}
    # Reject motions that would move any animated joint outside the normalized canvas.
    # This also protects user-authored rigs whose joints are close to an edge.
    for frame in frames:
        for name, point in frame["joints"].items():
            if any(not 0 <= coordinate <= 1 for coordinate in point):
                raise ValueError("Motion moves joint outside canvas: " + name)
    destination = Path(destination)
    # Exclusive creation ensures an existing animation is never overwritten.
    with destination.open("x", encoding="utf-8") as output:
        json.dump(timeline, output, indent=2)
        output.write("\n")
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description="Create NOVA loopable idle/wave/walk/jump timeline")
    parser.add_argument("mod_dir", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--motion", choices=("idle", "wave", "walk", "jump"), default="wave")
    args = parser.parse_args(argv)
    print(create_motion_timeline(args.mod_dir, args.destination, args.motion))


if __name__ == "__main__":
    main()
