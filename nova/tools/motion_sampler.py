"""Sample NOVA joint-keyframe clips without mutating source rig or motion data."""
import math


def sample_pose(rig, motion, clip, frame):
    """Return normalized joint positions at fractional frame, looping without a duplicate endpoint."""
    if rig.get('coordinate_system') != 'normalized_xy' or motion.get('coordinate_system') != 'normalized_xy_offsets':
        raise ValueError('unsupported coordinate system')
    if rig.get('variant') != motion.get('variant'):
        raise ValueError('rig/motion variant mismatch')
    frames = motion['clips'][clip]
    if len(frames) < 2 or frames[0]['frame'] != 0:
        raise ValueError('clip needs at least two frames starting at zero')
    indices = [key['frame'] for key in frames]
    if any(not isinstance(n, int) or isinstance(n, bool) for n in indices) or any(b <= a for a, b in zip(indices, indices[1:])):
        raise ValueError('keyframe indices must strictly increase')
    if frames[0]['offsets'] != frames[-1]['offsets']:
        raise ValueError('clip endpoint must match start for seamless looping')
    if not isinstance(frame, (int, float)) or not math.isfinite(frame):
        raise ValueError('frame must be finite')
    duration = indices[-1]
    if duration <= 0:
        raise ValueError('invalid clip duration')
    t = frame % duration
    left, right = next((a, b) for a, b in zip(frames, frames[1:]) if a['frame'] <= t < b['frame'])
    weight = (t - left['frame']) / (right['frame'] - left['frame'])
    joints = rig['joints']
    pose = {name: list(xy) for name, xy in joints.items()}
    for name in set(left['offsets']) | set(right['offsets']):
        if name not in joints:
            raise ValueError('unknown joint: ' + name)
        a = left['offsets'].get(name, [0, 0]); b = right['offsets'].get(name, [0, 0])
        if len(a) != 2 or len(b) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (*a, *b)):
            raise ValueError('invalid offset for ' + name)
        pose[name] = [joints[name][i] + a[i] * (1 - weight) + b[i] * weight for i in range(2)]
    return pose
