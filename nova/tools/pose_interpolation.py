"""Interpolate sparse NOVA joint keyframes into smooth renderer poses.

Angles are in degrees. Each keyframe has angles and duration_ms (time until
the next keyframe). The final keyframe can optionally loop to the first.
"""
import math


def interpolate_keyframes(keyframes, steps=4, loop=True):
    if not isinstance(keyframes, list) or len(keyframes) < 2:
        raise ValueError("At least two keyframes are required")
    if type(steps) is not int or not 1 <= steps <= 60:
        raise ValueError("steps must be an integer from 1 to 60")
    for frame in keyframes:
        if not isinstance(frame, dict) or not isinstance(frame.get("angles"), dict):
            raise ValueError("Invalid keyframe")
        duration = frame.get("duration_ms", 120)
        if type(duration) is not int or duration < 20 or duration > 10000:
            raise ValueError("Invalid keyframe duration")
        for angle in frame["angles"].values():
            if isinstance(angle, bool) or not isinstance(angle, (int, float)) or not math.isfinite(angle):
                raise ValueError("Invalid joint angle")
    result = []
    segments = len(keyframes) if loop else len(keyframes) - 1
    for i in range(segments):
        start = keyframes[i]
        end = keyframes[(i + 1) % len(keyframes)]
        duration = start.get("duration_ms", 120)
        if duration < 20 * steps:
            raise ValueError("Keyframe duration too short for requested steps")
        base, extra = divmod(duration, steps)
        names = set(start["angles"]) | set(end["angles"])
        for j in range(steps):
            t = j / steps
            smooth = t * t * (3 - 2 * t)
            angles = {
                name: (1 - smooth) * start["angles"].get(name, 0) + smooth * end["angles"].get(name, 0)
                for name in sorted(names)
            }
            result.append({"angles": angles, "duration_ms": base + (j < extra)})
    if not loop:
        result.append({"angles": dict(keyframes[-1]["angles"]), "duration_ms": keyframes[-1].get("duration_ms", 120)})
    if len(result) > 240:
        raise ValueError("Too many generated frames")
    return result
