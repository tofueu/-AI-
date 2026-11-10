"""Generate blank RGBA PNG layers and manifests for NOVA MOD authors.

This creates a scaffold, not finished character artwork or a complete rig.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

SLOTS = ('body', 'hair_back', 'head', 'eyes', 'mouth', 'clothes', 'hair_front', 'accessory')
SIZES = {'chibi': (512, 512), 'adult': (512, 768)}


def create_template(destination, variant):
    if variant not in SIZES:
        raise ValueError('variant must be chibi or adult')
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError(destination)
    width, height = SIZES[variant]
    destination.mkdir(parents=True)
    for slot in (*SLOTS, 'fallback_clothes'):
        Image.new('RGBA', (width, height), (0, 0, 0, 0)).save(destination / f'{slot}.png')
    # A visible, neutral base garment is required when a MOD hides its clothes.
    fallback = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fallback)\n    draw.rounded_rectangle((int(width * .31), int(height * .40), int(width * .69), int(height * .73)), radius=max(4, width // 32), fill=(100, 91, 135, 255))
    fallback.save(destination / 'fallback_clothes.png')
    rig = {
        'canvas': [width, height],
        'joints': {
            'root': {'parent': None, 'pivot': [0.5, 0.75]},
            'torso': {'parent': 'root', 'pivot': [0.5, 0.62]},
            'neck': {'parent': 'torso', 'pivot': [0.5, 0.39]},
            'head': {'parent': 'neck', 'pivot': [0.5, 0.29]},
            'left_arm': {'parent': 'torso', 'pivot': [0.36, 0.51]},
            'right_arm': {'parent': 'torso', 'pivot': [0.64, 0.51]},
            'left_leg': {'parent': 'root', 'pivot': [0.44, 0.77]},
            'right_leg': {'parent': 'root', 'pivot': [0.56, 0.77]},
        },
        'slot_joints': {
            'body': 'root', 'hair_back': 'head', 'head': 'head',
            'eyes': 'head', 'mouth': 'head', 'clothes': 'torso',
            'hair_front': 'head', 'accessory': 'head',
        },
    }
    manifest = {
        'variant': variant,
        'layers': [{'slot': slot, 'file': f'{slot}.png', 'visible': False} for slot in SLOTS],
        'fallback_clothes': 'fallback_clothes.png',
    }
    (destination / 'rig.json').write_text(json.dumps(rig, indent=2) + '\n', encoding='utf-8')
    (destination / 'mod.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (destination / 'poses.json').write_text(json.dumps([{'angles': {}, 'duration_ms': 120}], indent=2) + '\n', encoding='utf-8')
    (destination / 'README.txt').write_text(
        'NOVA blank MOD template: not finished character artwork.\n'
        'Paint body.png and clothes.png, then set their visible flags to true.\n'
        'Visible neutral fallback clothing is included; customize as needed.\n'
        'All PNGs must remain full-canvas RGBA. Empty slots may stay hidden.\n'
        'Eight-joint hierarchy is a scaffold; separate limb artwork is still required.\n',
        encoding='utf-8')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    parser.add_argument('--variant', choices=tuple(SIZES), required=True)
    args = parser.parse_args()
    print(create_template(args.destination, args.variant))
