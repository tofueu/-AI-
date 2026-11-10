"""Generate blank RGBA PNG layers and manifests for NOVA MOD authors.

This creates a scaffold, not finished character artwork or a complete rig.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

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
    rig = {
        'canvas': [width, height],
        'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
        'slot_joints': {slot: 'root' for slot in SLOTS},
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
        'Replace fallback_clothes.png with visible safe clothing before rendering.\n'
        'All PNGs must remain full-canvas RGBA. Empty slots may stay hidden.\n'
        'Root-only rig is a layout scaffold, not an articulated skeleton.\n',
        encoding='utf-8')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination')
    parser.add_argument('--variant', choices=tuple(SIZES), required=True)
    args = parser.parse_args()
    print(create_template(args.destination, args.variant))
