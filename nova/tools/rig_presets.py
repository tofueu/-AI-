"""Starter joint maps for NOVA chibi/adult MOD animation.

These are normalized engineering presets, not final character art or skinning.
Each MOD slot is assigned to a joint; artists can replace the poses per character.
"""
from copy import deepcopy

from nova.tools.create_mod_templates import VARIANTS
from nova.tools.mod_slot_resolver import SLOTS
from nova.tools.rig_tween import _validate_pose

_SLOT_JOINTS = {
    "body": "torso", "head": "head", "eyes": "head", "mouth": "head",
    "hair": "head", "hat": "head", "top": "torso", "bottom": "hips",
    "shoes": "feet", "accessory": "hand",
}

_REST = {
    "chibi": {
        "torso": (.50, .60, 0), "head": (.50, .32, 0),
        "hips": (.50, .73, 0), "feet": (.50, .88, 0), "hand": (.73, .58, 0),
    },
    "adult": {
        "torso": (.50, .53, 0), "head": (.50, .20, 0),
        "hips": (.50, .68, 0), "feet": (.50, .92, 0), "hand": (.71, .52, 0),
    },
}


def rig_preset(variant, motion="idle"):
    """Return independent (canvas, slot attachments, keyframes) for a variant.

    Motion is a seamless three-pose idle or wave cycle when rendered with loop=True.
    """
    if variant not in VARIANTS:
        raise ValueError("unknown NOVA variant")
    if motion not in ("idle", "wave"):
        raise ValueError("unknown NOVA motion")
    rest = deepcopy(_REST[variant])
    middle = deepcopy(rest)
    if motion == "idle":
        middle["head"] = (rest["head"][0], rest["head"][1] - .012, 3)
        middle["torso"] = (rest["torso"][0], rest["torso"][1] - .006, -1)
        middle["hand"] = (rest["hand"][0], rest["hand"][1] - .012, 2)
    else:
        middle["hand"] = (rest["hand"][0] - .035, rest["hand"][1] - .09, 25)
        middle["head"] = (rest["head"][0], rest["head"][1], -3)
    poses = [rest, middle, deepcopy(rest)]
    for pose in poses:
        _validate_pose(pose)
    return VARIANTS[variant], dict(_SLOT_JOINTS), poses
