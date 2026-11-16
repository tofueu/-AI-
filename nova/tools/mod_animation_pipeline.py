"""Connect replaceable MOD slots to the joint-driven animation renderer.

The official base layers are mandatory; MOD art is never modified.
"""
from nova.tools.mod_slot_resolver import resolve_mod_layers
from nova.tools.rig_layer_renderer import render_sequence
from nova.tools.export_rig_gif import export_rig_gif


def _prepare(base, mod, canvas, visibility, attachments):
    layers, visible = resolve_mod_layers(base, mod, canvas=canvas, visibility=visibility)
    if not isinstance(attachments, dict):
        raise ValueError("attachments must be a dictionary")
    missing = set(layers) - set(attachments)
    if missing:
        raise ValueError("missing joint attachments for: " + ", ".join(sorted(missing)))
    # The renderer requires exactly one attachment for every selected layer.
    selected = {slot: attachments[slot] for slot in layers}
    return layers, visible, selected


def render_mod_animation(base, mod, attachments, keyframes, canvas, *,
                         visibility=None, frames_per_segment=6,
                         loop=False, easing="smoothstep"):
    """Return composited RGBA frames with clothing fallback and hidden empty slots."""
    layers, visible, selected = _prepare(base, mod, canvas, visibility, attachments)
    return render_sequence(layers, selected, keyframes, canvas,
                           frames_per_segment=frames_per_segment,
                           loop=loop, easing=easing, visible=visible)


def export_mod_animation_gif(base, mod, attachments, keyframes, canvas,
                             output_path, *, visibility=None,
                             frames_per_segment=6, loop=True,
                             easing="smoothstep", frame_duration_ms=100):
    """Export a MOD-equipped animated character to a new GIF file."""
    layers, visible, selected = _prepare(base, mod, canvas, visibility, attachments)
    return export_rig_gif(layers, selected, keyframes, canvas, output_path,
                          frames_per_segment=frames_per_segment, loop=loop,
                          easing=easing, visible=visible,
                          frame_duration_ms=frame_duration_ms)
