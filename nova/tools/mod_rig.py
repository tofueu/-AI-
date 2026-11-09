"""NOVA normalized 2D joint metadata; does not itself animate artwork."""
import json
from pathlib import Path

RIGS = {
    'chibi': {'canvas': [512, 512], 'joints': {
        'root': {'parent': None, 'pivot': [0.50, 0.70]},
        'torso': {'parent': 'root', 'pivot': [0.50, 0.58]},
        'neck': {'parent': 'torso', 'pivot': [0.50, 0.40]},
        'head': {'parent': 'neck', 'pivot': [0.50, 0.31]},
        'arm_l': {'parent': 'torso', 'pivot': [0.37, 0.52]},
        'arm_r': {'parent': 'torso', 'pivot': [0.63, 0.52]},
        'leg_l': {'parent': 'root', 'pivot': [0.43, 0.73]},
        'leg_r': {'parent': 'root', 'pivot': [0.57, 0.73]},
    }},
    'adult': {'canvas': [512, 768], 'joints': {
        'root': {'parent': None, 'pivot': [0.50, 0.62]},
        'torso': {'parent': 'root', 'pivot': [0.50, 0.43]},
        'neck': {'parent': 'torso', 'pivot': [0.50, 0.26]},
        'head': {'parent': 'neck', 'pivot': [0.50, 0.18]},
        'arm_l': {'parent': 'torso', 'pivot': [0.36, 0.33]},
        'arm_r': {'parent': 'torso', 'pivot': [0.64, 0.33]},
        'leg_l': {'parent': 'root', 'pivot': [0.44, 0.63]},
        'leg_r': {'parent': 'root', 'pivot': [0.56, 0.63]},
    }},
}
SLOT_JOINTS = {
    'body': 'root', 'head': 'head', 'eyes': 'head', 'mouth': 'head',
    'hair_back': 'head', 'clothes': 'torso', 'hair_front': 'head',
    'accessory': 'head',
}


def validate(rig):
    joints = rig['joints']
    if not joints or 'root' not in joints or joints['root']['parent'] is not None:
        raise ValueError('Rig needs a root without parent')
    for name, joint in joints.items():
        pivot = joint['pivot']
        if len(pivot) != 2 or any(type(v) not in (int, float) or not 0 <= v <= 1 for v in pivot):
            raise ValueError(f'Invalid pivot: {name}')
        visited = {name}
        parent = joint['parent']
        while parent is not None:
            if parent not in joints or parent in visited:
                raise ValueError(f'Invalid parent chain: {name}')
            visited.add(parent)
            parent = joints[parent]['parent']
    if any(j not in joints for j in SLOT_JOINTS.values()):
        raise ValueError('Missing slot joint')
    return True


def generate(destination, variant):
    if variant not in RIGS:
        raise ValueError('Unknown variant')
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError('Refusing to overwrite rig')
    rig = {**RIGS[variant], 'variant': variant, 'slot_joints': SLOT_JOINTS}
    validate(rig)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(rig, indent=2) + '\n', encoding='utf-8')
    return destination


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', type=Path)
    parser.add_argument('--variant', choices=RIGS, required=True)
    args = parser.parse_args()
    print(generate(args.destination, args.variant))
