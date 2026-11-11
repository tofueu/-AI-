"""Render transparent NOVA part layers with pivot-based joint transforms."""
from PIL import Image
import math


def render_pose(parts, pose, canvas_size):
    """parts: ordered mappings with image (RGBA), pivot (x,y), joint, offset (x,y).

    Joint transforms are (dx,dy,degrees); rotations occur around the pivot.
    Empty layers are skipped. The original images are never mutated.
    """
    width, height = canvas_size
    if not all(type(v) is int and 0 < v <= 8192 for v in (width, height)):
        raise ValueError('Invalid canvas size')
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    for part in parts:
        layer = part['image']
        if layer.mode != 'RGBA':
            layer = layer.convert('RGBA')
        if layer.getbbox() is None:
            continue
        joint = part['joint']
        dx, dy, degrees = pose.get(joint, (0, 0, 0))
        px, py = part['pivot']
        ox, oy = part.get('offset', (0, 0))
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (dx, dy, degrees, px, py, ox, oy)):
            raise ValueError('Non-finite transform')
        rotated = layer.rotate(degrees, resample=Image.Resampling.BICUBIC,
                               center=(px, py), expand=False)
        x, y = round(ox + dx), round(oy + dy)
        result.alpha_composite(rotated, (x, y))
    return result


def render_loop(parts, keyframes, canvas_size, frame_count, duration_ms=100):
    """Return a list of RGBA frames, suitable for GIF or APNG export."""
    try:
        from .rig_animation import sample_loop
    except ImportError:
        from rig_animation import sample_loop
    if type(duration_ms) is not int or duration_ms < 20:
        raise ValueError('Invalid duration')
    return [render_pose(parts, pose, canvas_size) for pose in sample_loop(keyframes, frame_count)]
