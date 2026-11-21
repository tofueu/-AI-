#!/usr/bin/env python3
"""Render NOVA whiteboard SVG slots to transparent PNG (blank templates, not character art).

Usage: python nova/tools/export-whiteboard-png.py chibi [output_directory]
Requires: pip install cairosvg
"""
import argparse
import copy
import json
from pathlib import Path
import xml.etree.ElementTree as ET

SLOTS = ('body_base legs_back shoes clothes_base clothes_outer arms_back '
         'head_base ears eyes eyebrows nose mouth hair_back hair_front '
         'hat arms_front accessory').split()
SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)


def render_layers(source: Path, destination: Path) -> list[Path]:
    try:
        import cairosvg
    except ImportError as exc:
        raise RuntimeError('Missing dependency: pip install cairosvg') from exc
    root = ET.parse(source).getroot()
    if root.tag != f'{{{SVG_NS}}}svg':
        raise ValueError('Expected SVG root')
    groups = {}
    parents = {child: parent for parent in root.iter() for child in parent}
    for group in root.iter(f'{{{SVG_NS}}}g'):
        name = group.get('id')
        if name in SLOTS:
            if name in groups:
                raise ValueError(f'Duplicate layer: {name}')
            groups[name] = group
    missing = set(SLOTS) - groups.keys()
    if missing:
        raise ValueError('Missing layers: ' + ', '.join(sorted(missing)))
    destination.mkdir(parents=True, exist_ok=True)
    results = []
    for slot in SLOTS:
        isolated = ET.Element(root.tag, dict(root.attrib))
        # Definitions and styles can live inside nested groups, not only at root.
        # Copy them before the selected layer so url(#id) references resolve.
        for child in root.iter():
            if child.tag in (f'{{{SVG_NS}}}defs', f'{{{SVG_NS}}}style'):
                isolated.append(copy.deepcopy(child))
        # Preserve transforms and clipping inherited from ancestor groups.
        chain = []
        current = groups[slot]
        while current is not root:
            chain.append(current)
            current = parents[current]
        container = isolated
        for ancestor in reversed(chain[1:]):
            wrapper = ET.Element(ancestor.tag, dict(ancestor.attrib))
            container.append(wrapper)
            container = wrapper
        selected = copy.deepcopy(groups[slot])
        # A nested slot belongs to its own PNG, not its parent's output.
        def remove_other_slots(node):
            for child in list(node):
                if child.tag == f'{{{SVG_NS}}}g' and child.get('id') in SLOTS:
                    node.remove(child)
                else:
                    remove_other_slots(child)
        remove_other_slots(selected)
        container.append(selected)
        path = destination / f'{slot}.png'
        cairosvg.svg2png(bytestring=ET.tostring(isolated, encoding='utf-8'), write_to=str(path))
        results.append(path)
    # MOD tooling can distinguish deliberately blank template slots from painted art.
    from PIL import Image
    manifest = {'schema_version': 1, 'slots': []}
    for slot, path in zip(SLOTS, results):
        with Image.open(path) as image:
            rgba = image.convert('RGBA')
            manifest['slots'].append({
                'name': slot,
                'file': path.name,
                'width': rgba.width,
                'height': rgba.height,
                'empty': rgba.getchannel('A').getbbox() is None,
            })
    (destination / 'layers.json').write_text(
        json.dumps(manifest, indent=2) + '\\n', encoding='utf-8')
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('variant', choices=('chibi', 'adult'))
    parser.add_argument('destination', nargs='?', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    dest = args.destination or root / 'exports' / args.variant / 'png'
    files = render_layers(root / 'templates' / f'{args.variant}-whiteboard.svg', dest)
    print(f'Exported {len(files)} transparent PNG layers to {dest}')


if __name__ == '__main__':
    main()
