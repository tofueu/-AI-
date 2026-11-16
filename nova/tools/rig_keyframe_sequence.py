"""Generate continuous joint-angle timelines from normalized NOVA rig poses."""
from nova.tools.rig_tween import interpolate_pose, _validate_pose


def sequence_frames(keyframes, frames_per_segment=6, loop=False, easing="smoothstep"):
    """Interpolate every adjacent pair, with optional last-to-first loop."""
    if not isinstance(keyframes, (list, tuple)) or len(keyframes) < 2:
        raise ValueError("at least two keyframes required")
    if type(frames_per_segment) is not int or not 2 <= frames_per_segment <= 120:
        raise ValueError("frames_per_segment must be 2..120")
    if type(loop) is not bool or easing not in ("linear", "smoothstep"):
        raise ValueError("invalid loop or easing")
    poses = [_validate_pose(pose) for pose in keyframes]
    if any(pose.keys() != poses[0].keys() for pose in poses[1:]):
        raise ValueError("all keyframes must have matching joints")
    pairs = list(zip(poses, poses[1:]))
    if loop:
        pairs.append((poses[-1], poses[0]))
    result = []
    for start, end in pairs:
        for index in range(frames_per_segment):
            t = index / frames_per_segment
            if easing == "smoothstep":
                t = t * t * (3 - 2 * t)
            result.append(interpolate_pose(start, end, t))
    if not loop:
        result.append(poses[-1])
    return result
