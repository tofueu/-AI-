"""Render joint-anchored MOD layers to RGBA PNG frames and a looping GIF."""
import math
from pathlib import Path
from PIL import Image
from nova.tools.motion_sampler import sample_pose


def render_frames(rig, motion, layers, source_dir, clip, output_dir, frame_count=16):
    source = Path(source_dir).resolve()
    target = Path(output_dir).resolve()
    if target == source or source in target.parents:
        raise ValueError("output must be outside MOD source")
    if type(frame_count) is not int or frame_count < 2:
        raise ValueError("frame_count must be >= 2")
    width, height = rig["canvas"]
    if not all(type(v) is int and v > 0 for v in (width, height)):
        raise ValueError("invalid canvas")
    prepared = []
    for layer in sorted(layers, key=lambda item: item.get("order", 0)):
        if not layer.get("visible", True):
            continue
        path = (source / layer["file"]).resolve()
        if source not in path.parents or not path.is_file():
            raise ValueError("unsafe or missing layer")
        if layer["joint"] not in rig["joints"]:
            raise ValueError("unknown joint")
        anchor = layer.get("anchor")
        if (not isinstance(anchor, (list, tuple)) or len(anchor) != 2
                or any(type(v) not in (int, float) or not math.isfinite(v) for v in anchor)):
            raise ValueError("invalid layer anchor")
        with Image.open(path) as img:
            rgba = img.convert("RGBA")
            # A transparent placeholder is not a drawable layer.
            if rgba.getchannel("A").getbbox() is None:
                continue
            prepared.append((layer["joint"], layer["anchor"], rgba))
    if not prepared:
        raise ValueError("no nonempty visible layers")
    # Validate the actual clip and all joint offsets before creating any output.
    # A malformed clip must never leave behind a partial render directory.
    duration = motion["clips"][clip][-1]["frame"]
    # Validate every segment, including joints that appear only in later keys.
    # The sampler checks the two keys surrounding the requested time.
    keys = motion["clips"][clip]
    for left, right in zip(keys, keys[1:]):
        sample_pose(rig, motion, clip, (left["frame"] + right["frame"]) / 2)
    # Preflight every output pose, including base rig coordinates, before writing.
    poses = []
    for index in range(frame_count):
        pose = sample_pose(rig, motion, clip, duration * index / frame_count)
        for joint, _, _ in prepared:
            xy = pose[joint]
            if (not isinstance(xy, (list, tuple)) or len(xy) != 2
                    or any(type(v) not in (int, float) or not math.isfinite(v) for v in xy)):
                raise ValueError("invalid joint position")
        poses.append(pose)
    target.mkdir(parents=True, exist_ok=False)
    frames = []
    try:
        for index in range(frame_count):
            pose = poses[index]
            canvas = Image.new("RGBA", (width, height))
            for joint, anchor, img in prepared:
                x, y = pose[joint]
                canvas.alpha_composite(img, (round(x * width - anchor[0]), round(y * height - anchor[1])))
            canvas.save(target / f"frame_{index:04d}.png")
            frames.append(canvas)
        frames[0].save(target / "preview.gif", save_all=True,
                       append_images=frames[1:], duration=100, loop=0, disposal=2)
    except BaseException:
        import shutil
        shutil.rmtree(target)
        raise
    return target
