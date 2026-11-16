"""Export joint-driven NOVA MOD animation without overwriting existing files.

This module connects rig interpolation, RGBA layer rendering and GIF encoding.
It deliberately leaves source PNGs untouched.
"""
from pathlib import Path
from PIL import Image
from nova.tools.rig_layer_renderer import render_sequence


def export_rig_gif(layers, attachments, keyframes, canvas, output_path, *,
                   frames_per_segment=6, loop=True, easing="smoothstep",
                   visible=None, frame_duration_ms=100):
    """Render and exclusively create a GIF; return its output Path.

    The caller supplies full-canvas RGBA PIL layers in draw order. An existing
    output is never overwritten, even when two exporters race.
    """
    if type(frame_duration_ms) is not int or not 20 <= frame_duration_ms <= 60000:
        raise ValueError("frame_duration_ms must be between 20 and 60000")
    path = Path(output_path)
    if path.suffix.lower() != ".gif":
        raise ValueError("output must have .gif extension")
    frames = render_sequence(
        layers, attachments, keyframes, canvas,
        frames_per_segment=frames_per_segment, loop=loop,
        easing=easing, visible=visible,
    )
    if len(frames) < 2:
        raise ValueError("animation requires at least two frames")
    # Reserve the destination atomically, so concurrent jobs cannot overwrite it.
    with path.open("xb") as stream:
        try:
            frames[0].save(
                stream, format="GIF", save_all=True,
                append_images=frames[1:], duration=frame_duration_ms,
                **({"loop": 0} if loop else {}), disposal=2, optimize=False,
            )
        except BaseException:
            # An encoding failure must not leave a partial file behind.
            path.unlink(missing_ok=True)
            raise
    return path
