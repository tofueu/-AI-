"""One-call rendering for NOVA starter rigs; official art is supplied by caller.

The preset is an engineering scaffold, not a completed character design.
"""
from nova.tools.rig_presets import rig_preset
from nova.tools.mod_animation_pipeline import (
    render_mod_animation, export_mod_animation_gif,
)


def render_preset_animation(base, mod=None, *, variant="chibi", motion="idle",
                            visibility=None, frames_per_segment=6):
    """Render a loop using the selected variant's canvas, joints and poses."""
    canvas, attachments, poses = rig_preset(variant, motion)
    return render_mod_animation(
        base, mod, attachments, poses, canvas,
        visibility=visibility, frames_per_segment=frames_per_segment, loop=True,
    )


def export_preset_animation_gif(base, output_path, mod=None, *,
                                variant="chibi", motion="idle",
                                visibility=None, frames_per_segment=6,
                                frame_duration_ms=100):
    """Export without overwriting existing files or modifying input images."""
    canvas, attachments, poses = rig_preset(variant, motion)
    return export_mod_animation_gif(
        base, mod, attachments, poses, canvas, output_path,
        visibility=visibility, frames_per_segment=frames_per_segment,
        loop=True, frame_duration_ms=frame_duration_ms,
    )
