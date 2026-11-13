"""Interpolate normalized NOVA rig joints over a keyframe timeline."""
import math

def _point(value):
    if (not isinstance(value, (list, tuple)) or len(value) != 2
            or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in value)):
        raise ValueError("Joint coordinates must be finite normalized xy pairs")
    return [float(value[0]), float(value[1])]

def _blend(a, b, weight):
    return {k: [a[k][i] + (b[k][i] - a[k][i]) * weight for i in range(2)] for k in a}

def sample_pose(rig, timeline, time_ms):
    """Return a fresh joint map interpolated at time_ms without mutating inputs.

    Looping timelines blend the final keyframe back to the first across the
    remaining duration. For a smooth wrap, authors should put the first
    keyframe at time zero and leave time before duration for the return.
    """
    if type(time_ms) not in (int, float) or not math.isfinite(time_ms) or time_ms < 0:
        raise ValueError("Invalid sample time")
    if not isinstance(rig, dict) or not isinstance(timeline, dict):
        raise ValueError("Invalid rig or timeline")
    base = rig.get("joints")
    if not isinstance(base, dict) or not base:
        raise ValueError("Rig must contain joints")
    pose = {name: _point(xy) for name, xy in base.items()}
    duration = timeline.get("duration_ms")
    frames = timeline.get("frames")
    loop = timeline.get("loop", False)
    if type(duration) not in (int, float) or not math.isfinite(duration) or duration <= 0:
        raise ValueError("Invalid timeline duration")
    if type(loop) is not bool or not isinstance(frames, list) or not frames:
        raise ValueError("Invalid timeline frames or loop")
    previous = -1
    prepared = []
    for frame in frames:
        if not isinstance(frame, dict):
            raise ValueError("Invalid keyframe")
        t = frame.get("time_ms")
        changes = frame.get("joints")
        if (type(t) not in (int, float) or not math.isfinite(t)
                or t <= previous or t < 0 or t > duration
                or not isinstance(changes, dict) or any(k not in pose for k in changes)):
            raise ValueError("Invalid keyframe")
        prepared.append((t, {name: _point(xy) for name, xy in changes.items()}))
        previous = t
    states = []
    state = pose.copy()
    for t, changes in prepared:
        state = {**state, **changes}
        states.append((t, state))
    t = time_ms % duration if loop else min(time_ms, duration)
    if t < states[0][0]:
        # Before the first keyframe, ease from the authored rest pose rather
        # than jumping directly to a future keyframe.
        first_time, first_state = states[0]
        if first_time > 0:
            return _blend(pose, first_state, t / first_time)
    if t == states[0][0]:
        return {k: v.copy() for k, v in states[0][1].items()}
    for (ta, a), (tb, b) in zip(states, states[1:]):
        if ta <= t <= tb:
            return _blend(a, b, (t - ta) / (tb - ta))
    last_time, last_state = states[-1]
    if loop and last_time < duration:
        return _blend(last_state, states[0][1], (t - last_time) / (duration - last_time))
    return {k: v.copy() for k, v in last_state.items()}
