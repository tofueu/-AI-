"""Editable image-free NOVA rig blueprints for chibi and adult characters."""
from copy import deepcopy
import math

SLOT_JOINTS = {
    "body": "torso", "head": "head", "eyes": "head", "mouth": "head",
    "front_hair": "head", "back_hair": "head", "hat": "head",
    "top": "torso", "bottom": "root",
    "left_arm": "left_arm", "right_arm": "right_arm",
    "left_leg": "left_leg", "right_leg": "right_leg", "accessory": "torso",
}
PARENTS = {
    "root": None, "torso": "root", "neck": "torso", "head": "neck",
    "left_arm": "torso", "right_arm": "torso",
    "left_leg": "root", "right_leg": "root",
}
PIVOTS = {
    "chibi": {
        "root": (256, 315), "torso": (256, 315), "neck": (256, 225),
        "head": (256, 175), "left_arm": (194, 280),
        "right_arm": (318, 280), "left_leg": (225, 375),
        "right_leg": (287, 375),
    },
    "adult": {
        "root": (256, 505), "torso": (256, 430), "neck": (256, 235),
        "head": (256, 165), "left_arm": (188, 310),
        "right_arm": (324, 310), "left_leg": (222, 530),
        "right_leg": (290, 530),
    },
}


def create_blueprint(style):
    """Return a fresh editable rig and MOD slot template, without art assets."""
    if style not in PIVOTS:
        raise ValueError("Unknown NOVA style")
    joints = {name: {"parent": PARENTS[name], "pivot": list(pivot)}
              for name, pivot in PIVOTS[style].items()}
    slots = {
        name: {
            "joint": joint,
            "pivot": deepcopy(joints[joint]["pivot"]),
            "required": name in ("body", "head"),
            "fallback": "basic_clothing" if name in ("top", "bottom") else None,
        }
        for name, joint in SLOT_JOINTS.items()
    }
    return {
        "schema_version": 1, "style": style,
        "canvas_size": [512, 512 if style == "chibi" else 768],
        "joints": joints, "slots": slots,
    }


def validate_blueprint(blueprint):
    """Validate a user-edited blueprint before importing PNG/MOD layers."""
    if not isinstance(blueprint, dict) or blueprint.get("schema_version") != 1:
        raise ValueError("Unsupported blueprint schema")
    size = blueprint.get("canvas_size")
    if (not isinstance(size, list) or len(size) != 2
            or any(type(v) is not int or not 0 < v <= 8192 for v in size)):
        raise ValueError("Invalid canvas size")
    joints, slots = blueprint.get("joints"), blueprint.get("slots")
    if not isinstance(joints, dict) or not joints or not isinstance(slots, dict):
        raise ValueError("Missing joints or slots")
    for name, slot in slots.items():
        if not isinstance(slot, dict) or slot.get("joint") not in joints:
            raise ValueError("Invalid slot joint: " + str(name))
        pivot = slot.get("pivot")
        if (not isinstance(pivot, list) or len(pivot) != 2
                or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= size[i]
                       for i, v in enumerate(pivot))):
            raise ValueError("Invalid slot pivot: " + str(name))
    try:
        from .rig_hierarchy import resolve_hierarchy
    except ImportError:
        from rig_hierarchy import resolve_hierarchy
    resolve_hierarchy(joints, {})
    return True
