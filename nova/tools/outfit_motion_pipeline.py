"""Connect slot-based MOD outfit fallback to the joint animation renderer.

The base and MOD layers share one read-only asset root. Required body/clothing
slots must remain drawable even when a MOD hides or empties them.
"""
from nova.tools.mod_outfit import resolve_outfit
from nova.tools.layer_motion_renderer import render_frames


def render_outfit_frames(rig, motion, base_layers, mod_layers, source_dir,
                         clip, output_dir, frame_count=16):
    """Resolve slot overlays and render the selected layers as PNG/GIF.

    Each selected layer must supply slot, file, joint, and anchor fields.
    No source image or input layer definition is modified.
    """
    layers = resolve_outfit(base_layers, mod_layers, source_dir=source_dir)
    return render_frames(rig, motion, layers, source_dir, clip, output_dir,
                         frame_count=frame_count)
