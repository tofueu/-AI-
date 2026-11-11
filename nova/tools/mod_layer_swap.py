"""Create a new MOD variant by replacing one full-canvas PNG layer.

The source MOD and replacement image are never modified. This utility is
independent of the desktop UI and does not generate character artwork.
"""
import argparse
import json
import shutil
import tempfile
from pathlib import Path
from PIL import Image

ALLOWED_SLOTS = {
    'body', 'head', 'eyes', 'mouth', 'hair_back', 'hair_front',
    'clothes', 'accessory', 'left_arm', 'right_arm', 'left_leg', 'right_leg'
}


def replace_layer(source, slot, replacement, destination):
    source, replacement, destination = map(Path, (source, replacement, destination))
    if slot not in ALLOWED_SLOTS:
        raise ValueError(f'Unknown MOD slot: {slot}')
    if not source.is_dir() or not (source / 'mod.json').is_file():
        raise ValueError('Source is not a MOD folder')
    if destination.exists():
        raise FileExistsError(destination)
    # A variant must never be staged inside its own source tree.
    if destination.resolve().is_relative_to(source.resolve()):
        raise ValueError('Destination cannot be inside source MOD')
    if replacement.is_symlink():
        raise ValueError('Replacement cannot be a symlink')
    # copytree follows nested symlinks by default. Reject them before staging
    # so a crafted MOD cannot copy files from outside its own directory.
    for item in source.rglob('*'):
        if item.is_symlink():
            raise ValueError('Source MOD cannot contain symlinks')
    manifest = json.loads((source / 'mod.json').read_text(encoding='utf-8'))
    canvas = tuple(manifest['canvas'])
    if len(canvas) != 2 or any(type(x) is not int or x <= 0 for x in canvas):
        raise ValueError('Invalid canvas')
    layers = manifest['layers']
    if isinstance(layers, dict):
        filename = layers.get(slot, f'{slot}.png')
        layers[slot] = filename
    elif isinstance(layers, list):
        matching = [entry for entry in layers if entry['slot'] == slot]
        if len(matching) > 1:
            raise ValueError('Duplicate slot')
        filename = matching[0]['file'] if matching else f'{slot}.png'
        if not matching:
            layers.append({'slot': slot, 'file': filename, 'visible': True})
        else:
            matching[0]['visible'] = True
    else:
        raise ValueError('Invalid layers manifest')
    if any(other != slot and entry == filename for other, entry in layers.items()) if isinstance(layers, dict) else any(entry['slot'] != slot and entry['file'] == filename for entry in layers):
        raise ValueError('Layer filename is already used by another slot')
    target_name = Path(filename)
    if target_name.name != filename or filename in ('.', '..') or not filename.lower().endswith('.png'):
        raise ValueError('Unsafe layer filename')
    with Image.open(replacement) as image:
        if image.size != canvas or image.format != 'PNG':
            raise ValueError('Replacement must be full-canvas PNG')
        if image.mode not in ('RGBA', 'LA', 'P'):
            raise ValueError('Replacement must support transparency')
        if slot in ('body', 'clothes') and image.convert('RGBA').getchannel('A').getbbox() is None:
            raise ValueError('Required body/clothes layer cannot be empty')
        image.load()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.nova_swap_') as temp:
        stage = Path(temp) / 'mod'
        shutil.copytree(source, stage, symlinks=False)
        shutil.copyfile(replacement, stage / filename)
        (stage / 'mod.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        if destination.exists():
            raise FileExistsError(destination)
        stage.rename(destination)
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('slot', choices=sorted(ALLOWED_SLOTS))
    parser.add_argument('replacement')
    parser.add_argument('destination')
    args = parser.parse_args()
    print(replace_layer(args.source, args.slot, args.replacement, args.destination))
