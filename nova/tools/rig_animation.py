"""NOVA joint-pose interpolation for Q and adult rigs (rendering independent)."""
import math

def interpolate_pose(keyframes, progress):
    """Return interpolated {joint: (dx, dy, degrees)} for normalized progress."""
    if not isinstance(progress, (int, float)) or not math.isfinite(progress) or not 0 <= progress <= 1:
        raise ValueError("Invalid progress")
    if not isinstance(keyframes, list) or len(keyframes) < 2:
        raise ValueError("At least two keyframes required")
    times = [frame.get("time") for frame in keyframes]
    if times[0] != 0 or times[-1] != 1 or any(type(t) not in (int, float) or not math.isfinite(t) for t in times) or any(a >= b for a, b in zip(times, times[1:])):
        raise ValueError("Keyframe times must increase from 0 to 1")
    for frame in keyframes:
        poses = frame.get("pose")
        if not isinstance(poses, dict):
            raise ValueError("Invalid pose")
        for transform in poses.values():
            if not isinstance(transform, list) or len(transform) != 3 or any(type(x) not in (int, float) or not math.isfinite(x) for x in transform):
                raise ValueError("Invalid transform")
    for i in range(len(times)-1):
        if progress <= times[i+1]:
            ratio = (progress-times[i])/(times[i+1]-times[i])
            before, after = keyframes[i]["pose"], keyframes[i+1]["pose"]
            return {joint: tuple((1-ratio)*a+ratio*b for a,b in zip(before.get(joint,[0,0,0]),after.get(joint,[0,0,0]))) for joint in before.keys() | after.keys()}
    raise AssertionError("Unreachable")

def sample_loop(keyframes, frame_count):
    """Sample loop without repeating first frame at end."""
    if type(frame_count) is not int or not 2 <= frame_count <= 240:
        raise ValueError("Invalid frame count")
    return [interpolate_pose(keyframes, i/frame_count) for i in range(frame_count)]
