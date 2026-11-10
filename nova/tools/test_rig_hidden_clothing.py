"""Check that hidden MOD clothing cannot bypass the safe fallback."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .rig_animator import export
except ImportError:
    from rig_animator import export


class HiddenClothingTests(unittest.TestCase):
    def test_hidden_clothing_uses_fallback(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'rig.json').write_text(json.dumps({
                'canvas': [12, 12],
                'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
                'slot_joints': {'body': 'root', 'clothes': 'root'}
            }), encoding='utf-8')
            (root / 'poses.json').write_text('[{"angles": {}}]', encoding='utf-8')
            Image.new('RGBA', (12, 12), (50, 50, 50, 255)).save(root / 'body.png')
            Image.new('RGBA', (12, 12), (20, 150, 200, 255)).save(root / 'safe.png')
            (root / 'mod.json').write_text(json.dumps({
                'layers': [
                    {'slot': 'body', 'file': 'body.png'},
                    {'slot': 'clothes', 'file': 'not-present.png', 'visible': False}
                ],
                'fallback_clothes': 'safe.png'
            }), encoding='utf-8')
            out = root / 'result.png'
            export(root / 'rig.json', root / 'mod.json', root / 'poses.json', out)
            with Image.open(out) as result:
                self.assertEqual(result.convert('RGBA').getpixel((6, 6)),
                                 (20, 150, 200, 255))

    def test_visible_clothing_does_not_require_fallback(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'rig.json').write_text(json.dumps({
                'canvas': [12, 12],
                'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
                'slot_joints': {'body': 'root', 'clothes': 'root'}
            }), encoding='utf-8')
            (root / 'poses.json').write_text('[{"angles": {}}]', encoding='utf-8')
            Image.new('RGBA', (12, 12), (50, 50, 50, 255)).save(root / 'body.png')
            Image.new('RGBA', (12, 12), (70, 120, 180, 255)).save(root / 'shirt.png')
            (root / 'mod.json').write_text(json.dumps({
                'layers': {'body': 'body.png', 'clothes': 'shirt.png'}
            }), encoding='utf-8')
            out = root / 'result.png'
            export(root / 'rig.json', root / 'mod.json', root / 'poses.json', out)
            with Image.open(out) as result:
                self.assertEqual(result.convert('RGBA').getpixel((6, 6)),
                                 (70, 120, 180, 255))


if __name__ == '__main__':
    unittest.main()
