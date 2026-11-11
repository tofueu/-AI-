"""Compose a NOVA rig animation from layer definitions and keyframes."""
from pathlib import Path

try:
    from .rig_render import render_loop
    from .rig_gif import export_gif
except ImportError:
    from rig_render import render_loop
    from rig_gif import export_gif


def export_rig_animation(parts, keyframes, canvas_size, frame_count, destination,
                         duration_ms=100, loop=0):
    """Render joint-driven GIF without changing source images or overwriting output."""
    if not isinstance(parts, (list, tuple)) or not parts:
        raise ValueError("At least one rig part required")
    if type(frame_count) is not int or not 2 <= frame_count <= 240:
        raise ValueError("Invalid frame count")
    if type(duration_ms) is not int or not 20 <= duration_ms <= 60000:
        raise ValueError("Invalid frame duration")
    if type(loop) is not int or not 0 <= loop <= 65535:
        raise ValueError("Invalid loop count")
    path = Path(destination)
    if path.suffix.lower() != ".gif":
        raise ValueError("Destination must be a GIF")
    if path.exists():
        raise FileExistsError(path)
    frames = render_loop(parts, keyframes, canvas_size, frame_count, duration_ms)
    return export_gif(frames, path, duration_ms, loop)
