"""Resolve parent-child NOVA joints into world-space transforms.

Each joint has a parent (or None) and a local pivot in canvas coordinates.
Poses are local (dx, dy, degrees); a child follows its parent's rotation.
"""
import math


def resolve_hierarchy(joints, pose):
    """Return {joint: (world_dx, world_dy, world_degrees)}.

    Joint definitions: {name: {"parent": name|None, "pivot": [x, y]}}.
    Coordinates and transforms use the same unrotated canvas reference.
    """
    if not isinstance(joints, dict) or not joints:
        raise ValueError("Joint definitions required")
    if not isinstance(pose, dict):
        raise ValueError("Pose must be a mapping")
    resolved = {}
    visiting = set()

    def finite_pair(values):
        return (isinstance(values, (tuple, list)) and len(values) == 2
                and all(type(v) in (int, float) and math.isfinite(v) for v in values))

    def solve(name):
        if name in resolved:
            return resolved[name]
        if name in visiting:
            raise ValueError("Joint hierarchy cycle")
        if name not in joints:
            raise ValueError("Unknown parent joint: " + str(name))
        spec = joints[name]
        if not isinstance(spec, dict) or not finite_pair(spec.get("pivot")):
            raise ValueError("Invalid joint pivot: " + str(name))
        transform = pose.get(name, [0, 0, 0])
        if (not isinstance(transform, (list, tuple)) or len(transform) != 3
                or any(type(v) not in (int, float) or not math.isfinite(v) for v in transform)):
            raise ValueError("Invalid joint transform: " + str(name))
        visiting.add(name)
        parent = spec.get("parent")
        dx, dy, angle = transform
        if parent is not None:
            pdx, pdy, pa = solve(parent)
            pivot = spec["pivot"]
            parent_pivot = joints[parent]["pivot"]
            vx, vy = pivot[0] - parent_pivot[0], pivot[1] - parent_pivot[1]
            rad = math.radians(pa)
            c, s = math.cos(rad), math.sin(rad)
            # Pillow's positive angles are counterclockwise in image coordinates.
            rotated_x, rotated_y = c * vx + s * vy, -s * vx + c * vy
            local_x, local_y = c * dx + s * dy, -s * dx + c * dy
            dx = pdx + rotated_x - vx + local_x
            dy = pdy + rotated_y - vy + local_y
            angle += pa
        visiting.remove(name)
        resolved[name] = (dx, dy, angle)
        return resolved[name]

    for name in joints:
        solve(name)
    if set(pose) - set(joints):
        raise ValueError("Pose references unknown joints")
    return resolved
