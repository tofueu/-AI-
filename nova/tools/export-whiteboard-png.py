#!/usr/bin/env python3
"""Render NOVA whiteboard SVG slots to transparent PNG (blank templates, not character art).

Usage: python nova/tools/export-whiteboard-png.py chibi [output_directory]
Requires: pip install cairosvg
"""
import argparse
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
        isolated.append(ET.fromstring(ET.tostring(groups[slot], encoding='unicode')))
        path = destination / f'{slot}.png'
        cairosvg.svg2png(bytestring=ET.tostring(isolated, encoding='utf-8'), write_to=str(path))
        results.append(path)
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
