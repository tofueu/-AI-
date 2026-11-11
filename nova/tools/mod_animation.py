"""Render a loaded NOVA MOD into a GIF using its style-specific joint rig.

This adapter does not modify the original MOD assets or connect to AI Workbench.
"""
try:
    from .mod_loader import load_mod
    from .rig_pipeline import export_rig_animation
except ImportError:
    from mod_loader import load_mod
    from rig_pipeline import export_rig_animation


def export_mod_animation(mod_directory, keyframes, frame_count, destination,
                         duration_ms=100, loop=0, fallback_directory=None):
    """Load PNG slots, resolve joint hierarchy, and export a looping GIF."""
    blueprint, parts = load_mod(mod_directory, fallback_directory)
    return export_rig_animation(
        parts=parts,
        keyframes=keyframes,
        canvas_size=tuple(blueprint["canvas_size"]),
        frame_count=frame_count,
        destination=destination,
        duration_ms=duration_ms,
        loop=loop,
        joints=blueprint["joints"],
    )
