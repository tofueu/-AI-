"""Render a directory-based PNG MOD without changing the source files.

This is the public entry point for unpacked artist MOD folders. Official
base layers and joint attachments are supplied by the caller.
"""
from nova.tools.mod_png_loader import load_mod_png_slots
from nova.tools.mod_animation_pipeline import (
    render_mod_animation, export_mod_animation_gif,
)


def render_png_mod_directory(base, directory, attachments, keyframes, canvas, *,
                             visibility=None, frames_per_segment=6,
                             loop=False, easing="smoothstep"):
    """Load flat slot PNGs and return composited RGBA animation frames."""
    mod = load_mod_png_slots(directory, canvas)
    return render_mod_animation(
        base, mod, attachments, keyframes, canvas,
        visibility=visibility, frames_per_segment=frames_per_segment,
        loop=loop, easing=easing,
    )


def export_png_mod_directory_gif(base, directory, attachments, keyframes,
                                 canvas, output_path, *, visibility=None,
                                 frames_per_segment=6, loop=True,
                                 easing="smoothstep", frame_duration_ms=100):
    """Load flat slot PNGs and export an animated GIF (no overwrite)."""
    mod = load_mod_png_slots(directory, canvas)
    return export_mod_animation_gif(
        base, mod, attachments, keyframes, canvas, output_path,
        visibility=visibility, frames_per_segment=frames_per_segment,
        loop=loop, easing=easing, frame_duration_ms=frame_duration_ms,
    )
