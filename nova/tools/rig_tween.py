"""Deterministic joint keyframe interpolation for NOVA character rigs.

Coordinates are normalized to the canvas (0..1); angles are degrees.
This module is independent of artwork and works for chibi and adult rigs.
"""
from collections.abc import Mapping
from math import isfinite


def _validate_pose(pose):
    if not isinstance(pose, Mapping) or not pose:
        raise ValueError("pose must contain joints")
    result = {}
    for name, values in pose.items():
        if not isinstance(name, str) or not name:
            raise ValueError("invalid joint name")
        if not isinstance(values, (list, tuple)) or len(values) != 3:
            raise ValueError("joint values must be (x, y, angle)")
        if any(type(v) not in (float, int) or not isfinite(v) for v in values):
            raise ValueError("joint values must be finite numbers")
        x, y, angle = values
        if not (0 <= x <= 1 and 0 <= y <= 1):
            raise ValueError("joint coordinates must be normalized")
        result[name] = (float(x), float(y), float(angle))
    return result


def interpolate_pose(start, end, fraction):
    """Interpolate matching joint maps; use shortest angular rotation."""
    a, b = _validate_pose(start), _validate_pose(end)
    if a.keys() != b.keys():
        raise ValueError("joint sets must match")
    if type(fraction) not in (int, float) or not isfinite(fraction) or not 0 <= fraction <= 1:
        raise ValueError("fraction must be between zero and one")
    t = float(fraction)
    if t == 0:
        return a
    if t == 1:
        return b
    output = {}
    for joint, (x, y, angle) in a.items():
        nx, ny, next_angle = b[joint]
        delta = (next_angle - angle + 180) % 360 - 180
        output[joint] = (x + (nx - x) * t, y + (ny - y) * t, angle + delta * t)
    return output


def tween_frames(start, end, count):
    """Include both endpoints in a fixed-count transition."""
    if type(count) is not int or count < 2 or count > 240:
        raise ValueError("frame count must be 2..240")
    return [interpolate_pose(start, end, index / (count - 1)) for index in range(count)]
