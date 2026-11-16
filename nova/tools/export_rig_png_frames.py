"""Export joint-driven NOVA animation as editable transparent PNG frames.

Each frame retains RGBA transparency and can be imported as a layer in a PSD
editor. This exporter never changes the source artwork or replaces a directory.
"""
import json
from pathlib import Path
from nova.tools.rig_layer_renderer import render_sequence


def export_rig_png_frames(layers, attachments, keyframes, canvas, output_dir, *,
                          frames_per_segment=6, loop=True, easing="smoothstep",
                          visible=None, frame_duration_ms=100):
    """Create a new directory with numbered RGBA PNGs and timing metadata."""
    if type(frame_duration_ms) is not int or not 20 <= frame_duration_ms <= 60000:
        raise ValueError("frame_duration_ms must be between 20 and 60000")
    path = Path(output_dir)
    frames = render_sequence(
        layers, attachments, keyframes, canvas,
        frames_per_segment=frames_per_segment, loop=loop,
        easing=easing, visible=visible,
    )
    if len(frames) < 2:
        raise ValueError("animation requires at least two frames")
    # mkdir without exist_ok is exclusive: never overwrite an existing export.
    path.mkdir(parents=False, exist_ok=False)
    try:
        names = []
        for index, frame in enumerate(frames):
            name = f"frame_{index:04d}.png"
            frame.save(path / name, format="PNG")
            names.append(name)
        manifest = {
            "schema_version": 1,
            "canvas": list(canvas),
            "frame_duration_ms": frame_duration_ms,
            "loop": loop,
            "frames": names,
        }
        (path / "animation.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
    except BaseException:
        # Remove only files created by this exporter; do not touch other paths.
        for name in names:
            (path / name).unlink(missing_ok=True)
        (path / f"frame_{len(names):04d}.png").unlink(missing_ok=True)
        (path / "animation.json").unlink(missing_ok=True)
        path.rmdir()
        raise
    return path
