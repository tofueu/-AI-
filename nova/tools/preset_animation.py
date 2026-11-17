"""One-call rendering for NOVA starter rigs; official art is supplied by caller.

The preset is an engineering scaffold, not a completed character design.
"""
import json
from pathlib import Path
from shutil import rmtree

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


def export_preset_png_sequence(base, output_dir, mod=None, *,
                               variant="chibi", motion="idle",
                               visibility=None, frames_per_segment=6,
                               frame_duration_ms=100):
    """Write inspectable RGBA frames and a manifest into a new directory.

    Existing directories are never modified. On export failure the newly
    created directory is removed so incomplete sequences cannot be mistaken
    for reviewable animation.
    """
    if type(frame_duration_ms) is not int or not 1 <= frame_duration_ms <= 60000:
        raise ValueError("frame_duration_ms must be an integer from 1 to 60000")
    frames = render_preset_animation(
        base, mod, variant=variant, motion=motion,
        visibility=visibility, frames_per_segment=frames_per_segment,
    )
    destination = Path(output_dir)
    destination.mkdir(parents=False, exist_ok=False)
    try:
        filenames = []
        for index, frame in enumerate(frames):
            filename = f"frame_{index:04d}.png"
            frame.save(destination / filename, format="PNG")
            filenames.append(filename)
        manifest = {
            "variant": variant, "motion": motion,
            "frame_duration_ms": frame_duration_ms,
            "canvas": list(frames[0].size), "frames": filenames,
            "status": "engineering_preview_not_final_art",
        }
        (destination / "manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
    except Exception:
        rmtree(destination)
        raise
    return destination
