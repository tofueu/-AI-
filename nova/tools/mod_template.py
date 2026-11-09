"""Generate editable NOVA MOD starter templates (placeholders, not character art)."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

SLOTS = ('body', 'head', 'eyes', 'mouth', 'hair_back', 'clothes', 'hair_front', 'accessory')
SIZES = {'chibi': (512, 512), 'adult': (512, 768)}


def generate(destination, variant):
    if variant not in SIZES:
        raise ValueError('Unknown variant')
    destination = Path(destination)
    if destination.exists():
        raise FileExistsError('Refusing to overwrite existing template folder')
    width, height = SIZES[variant]
    destination.mkdir(parents=True)
    for slot in SLOTS:
        image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        if slot == 'body':
            # Neutral silhouette; artists replace this placeholder with final character art.
            d = ImageDraw.Draw(image)
            d.ellipse((width*.30, height*.18, width*.70, height*.55), fill=(170, 160, 190, 255))
            d.rounded_rectangle((width*.34, height*.45, width*.66, height*.84), radius=25, fill=(170, 160, 190, 255))
        elif slot == 'clothes':
            d = ImageDraw.Draw(image)
            d.rounded_rectangle((width*.34, height*.48, width*.66, height*.72), radius=15, fill=(150, 115, 205, 255))
        image.save(destination / f'{slot}.png')
    manifest = {'variant': variant, 'canvas': [width, height],
                'layers': {slot: f'{slot}.png' for slot in SLOTS},
                'fallback_clothes': 'clothes.png'}
    (destination / 'mod.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (destination / 'README.txt').write_text(
        'NOVA editable MOD starter. These are placeholder silhouettes, NOT approved character designs.\n'
        'Replace each same-size transparent PNG with your artwork; keep mod.json layer names.\n'
        'Fully transparent optional slots are hidden. body and clothes are placeholders.\n', encoding='utf-8')
    return destination


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('destination', type=Path)
    p.add_argument('--variant', choices=SIZES, required=True)
    a = p.parse_args()
    print(generate(a.destination, a.variant))
