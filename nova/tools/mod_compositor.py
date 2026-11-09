"""NOVA MOD layer compositor. Transparent layers are hidden; base body required."""
import argparse
import json
from pathlib import Path
from PIL import Image

SLOTS = ('body', 'head', 'eyes', 'mouth', 'hair_back', 'clothes', 'hair_front', 'accessory')


def render(manifest_path, output_path):
    manifest_path = Path(manifest_path).resolve()
    output_path = Path(output_path).resolve()
    if output_path.suffix.lower() != '.png':
        raise ValueError('Output must be PNG')
    if output_path.exists():
        raise FileExistsError('Refusing to overwrite existing output')
    data = json.loads(manifest_path.read_text(encoding='utf-8'))
    canvas = data['canvas']
    if not isinstance(canvas, list) or len(canvas) != 2 or any(type(v) is not int or not 1 <= v <= 8192 for v in canvas):
        raise ValueError('Invalid canvas size')
    layers = data['layers']
    if not isinstance(layers, dict) or any(slot not in SLOTS for slot in layers):
        raise ValueError('Unknown layer slot')
    if not layers.get('body'):
        raise ValueError('A base body/clothing layer is required')
    root = manifest_path.parent
    result = Image.new('RGBA', tuple(canvas), (0, 0, 0, 0))
    for slot in SLOTS:
        name = layers.get(slot)
        if not name:
            continue
        if not isinstance(name, str):
            raise ValueError('Layer path must be a string')
        path = (root / name).resolve()
        if not path.is_relative_to(root) or path.suffix.lower() != '.png':
            raise ValueError('Layer must be a PNG inside the MOD folder')
        with Image.open(path) as source:
            layer = source.convert('RGBA')
            if layer.size != tuple(canvas):
                raise ValueError(f'Wrong size for {slot}: {layer.size}')
            if layer.getbbox() is None:
                if slot == 'body':
                    raise ValueError('Base body layer cannot be fully transparent')
                continue
            result.alpha_composite(layer)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path)
    return output_path


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    print(render(args.manifest, args.output))
