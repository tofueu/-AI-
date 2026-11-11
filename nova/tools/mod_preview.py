"""Preview full-canvas NOVA MOD layers, hiding empty layers and requiring clothing.

This is a static preview utility; it does not produce PSD or skeletal animation.
"""
import json
from pathlib import Path
from PIL import Image

ORDER = ('body', 'left_leg', 'right_leg', 'hair_back', 'clothes',
         'left_arm', 'right_arm', 'head', 'eyes', 'mouth', 'hair_front', 'accessory')

def preview_mod(source, output, *, fallback_clothes=None):
    source, output = Path(source), Path(output)
    if output.exists():
        raise FileExistsError(output)
    if output.resolve().is_relative_to(source.resolve()):
        raise ValueError('Output must be outside source MOD')
    manifest = json.loads((source / 'mod.json').read_text(encoding='utf-8'))
    canvas = manifest['canvas']
    if not isinstance(canvas, list) or len(canvas) != 2 or any(type(n) is not int or not 0 < n <= 8192 for n in canvas):
        raise ValueError('Invalid canvas')
    entries = manifest['layers']
    if isinstance(entries, dict):
        entries = [{'slot': k, 'file': v} for k, v in entries.items()]
    if not isinstance(entries, list):
        raise ValueError('Invalid layers')
    layers = {}
    for entry in entries:
        slot, name = entry['slot'], entry['file']
        if slot not in ORDER or slot in layers or not isinstance(name, str) or Path(name).name != name or name in ('.', '..') or not name.lower().endswith('.png'):
            raise ValueError('Invalid or duplicate layer')
        layers[slot] = entry
    composites = {}
    shown = []
    for slot in ORDER:
        entry = layers.get(slot)
        if not entry or entry.get('visible', True) is False:
            continue
        path = source / entry['file']
        if path.is_symlink():
            raise ValueError('Symlink layer not allowed')
        if not path.exists():
            continue
        with Image.open(path) as img:
            if img.format != 'PNG' or img.size != tuple(canvas):
                raise ValueError('Layer must be full-canvas PNG')
            layer = img.convert('RGBA')
            if layer.getchannel('A').getbbox() is None:
                continue
            composites[slot] = layer
            shown.append(slot)
    if 'clothes' not in composites:
        if fallback_clothes is None:
            raise ValueError('Visible clothing missing; provide fallback_clothes')
        fallback = Path(fallback_clothes)
        if fallback.is_symlink():
            raise ValueError('Symlink fallback not allowed')
        with Image.open(fallback) as img:
            if img.format != 'PNG' or img.size != tuple(canvas):
                raise ValueError('Fallback must be full-canvas PNG')
            layer = img.convert('RGBA')
            if layer.getchannel('A').getbbox() is None:
                raise ValueError('Fallback clothing is empty')
            composites['clothes'] = layer
            shown.append('fallback_clothes')
    result = Image.new('RGBA', tuple(canvas), (0, 0, 0, 0))
    for slot in ORDER:
        if slot in composites:
            result.alpha_composite(composites[slot])
    output.parent.mkdir(parents=True, exist_ok=True)
    result.save(output, format='PNG')
    return shown
