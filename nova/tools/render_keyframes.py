"""Render a NOVA MOD GIF directly from sparse joint keyframes.

Usage: python -m nova.tools.render_keyframes RIG MOD KEYFRAMES OUTPUT.gif
"""
import argparse
import json
from pathlib import Path

try:
    from .pose_interpolation import interpolate_keyframes
    from .rig_animator import export
except ImportError:
    from pose_interpolation import interpolate_keyframes
    from rig_animator import export


def render_keyframes(rig_path, manifest_path, keyframes_path, output_path, *, steps=4, loop=True):
    """Interpolate to a temporary pose file, then render without changing sources."""
    import tempfile

    output_path = Path(output_path)
    if output_path.suffix.lower() != ".gif":
        raise ValueError("Keyframe animation output must be GIF")
    if output_path.exists():
        raise FileExistsError(output_path)
    keyframes = json.loads(Path(keyframes_path).read_text(encoding="utf-8"))
    poses = interpolate_keyframes(keyframes, steps=steps, loop=loop)
    with tempfile.TemporaryDirectory(prefix="nova_keyframes_") as temp:
        timeline = Path(temp) / "poses.json"
        timeline.write_text(json.dumps(poses), encoding="utf-8")
        return export(rig_path, manifest_path, timeline, output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rig")
    parser.add_argument("manifest")
    parser.add_argument("keyframes")
    parser.add_argument("output")
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--no-loop", action="store_true")
    args = parser.parse_args()
    print(render_keyframes(args.rig, args.manifest, args.keyframes, args.output,
                           steps=args.steps, loop=not args.no_loop))
