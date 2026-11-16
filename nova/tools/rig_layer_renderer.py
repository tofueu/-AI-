"""Render full-canvas transparent MOD layers at interpolated rig joints.

Each slot is attached to one joint. Rest and target coordinates are normalized;
angles rotate around the rest joint anchor before translating to the target.
The input layers are not mutated. Caller controls draw order and visibility.
"""
from PIL import Image
from nova.tools.rig_tween import _validate_pose
from nova.tools.rig_keyframe_sequence import sequence_frames


def render_pose(layers, attachments, rest_pose, target_pose, canvas, visible=None):
    rest, target = _validate_pose(rest_pose), _validate_pose(target_pose)
    if rest.keys() != target.keys():
        raise ValueError("joint sets must match")
    if (not isinstance(canvas, tuple) or len(canvas) != 2 or
            any(type(n) is not int or not 1 <= n <= 4096 for n in canvas)):
        raise ValueError("invalid canvas")
    if not isinstance(layers, dict) or not isinstance(attachments, dict):
        raise ValueError("layers and attachments must be dictionaries")
    if set(layers) != set(attachments):
        raise ValueError("each layer requires one attachment")
    if visible is not None and (not isinstance(visible, dict) or
                                any(type(v) is not bool for v in visible.values()) or
                                not set(visible).issubset(layers)):
        raise ValueError("invalid visibility map")
    w, h = canvas
    result = Image.new("RGBA", canvas)
    for slot, layer in layers.items():
        joint = attachments[slot]
        if joint not in rest:
            raise ValueError("unknown attachment joint")
        if not isinstance(layer, Image.Image) or layer.mode != "RGBA" or layer.size != canvas:
            raise ValueError("layers must be full-canvas RGBA images")
        if visible is not None and not visible.get(slot, True):
            continue
        if layer.getchannel("A").getbbox() is None:
            continue
        x0, y0, a0 = rest[joint]
        x1, y1, a1 = target[joint]
        rotated = layer.rotate(a1 - a0, resample=Image.Resampling.BICUBIC,
                               center=(x0 * w, y0 * h))
        dx, dy = round((x1 - x0) * w), round((y1 - y0) * h)
        moved = Image.new("RGBA", canvas)
        moved.paste(rotated, (dx, dy))
        result = Image.alpha_composite(result, moved)
    return result


def render_sequence(layers, attachments, keyframes, canvas, *,
                    frames_per_segment=6, loop=False, easing="smoothstep", visible=None):
    """Return actual composited RGBA frames, not merely joint coordinates."""
    if not isinstance(keyframes, (list, tuple)) or not keyframes:
        raise ValueError("missing rest pose")
    poses = sequence_frames(keyframes, frames_per_segment, loop, easing)
    return [render_pose(layers, attachments, keyframes[0], pose, canvas, visible)
            for pose in poses]
