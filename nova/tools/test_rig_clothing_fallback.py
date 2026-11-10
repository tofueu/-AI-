"""Regression tests for clothing fallback in NOVA animation exports."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .rig_animator import export
except ImportError:
    from rig_animator import export


class ClothingFallbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.rig = self.root / 'rig.json'
        self.manifest = self.root / 'mod.json'
        self.poses = self.root / 'poses.json'
        self.output = self.root / 'out.png'
        self.rig.write_text(json.dumps({
            'canvas': [16, 16],
            'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
            'slot_joints': {'body': 'root', 'clothes': 'root'}
        }), encoding='utf-8')
        self.poses.write_text('[{"angles": {}}]', encoding='utf-8')
        Image.new('RGBA', (16, 16), (40, 50, 60, 255)).save(self.root / 'body.png')
        Image.new('RGBA', (16, 16), (160, 80, 200, 255)).save(self.root / 'safe.png')

    def write_manifest(self, **kwargs):
        self.manifest.write_text(json.dumps({
            'layers': {'body': 'body.png'}, **kwargs
        }), encoding='utf-8')

    def test_missing_clothes_uses_visible_fallback(self):
        self.write_manifest(fallback_clothes='safe.png')
        export(self.rig, self.manifest, self.poses, self.output)
        with Image.open(self.output) as result:
            self.assertEqual(result.convert('RGBA').getpixel((8, 8)), (160, 80, 200, 255))

    def test_transparent_clothes_uses_fallback(self):
        Image.new('RGBA', (16, 16)).save(self.root / 'empty.png')
        self.write_manifest(layers={'body': 'body.png', 'clothes': 'empty.png'},
                            fallback_clothes='safe.png')
        export(self.rig, self.manifest, self.poses, self.output)
        with Image.open(self.output) as result:
            self.assertEqual(result.convert('RGBA').getpixel((8, 8)), (160, 80, 200, 255))

    def test_transparent_fallback_is_rejected_without_output(self):
        Image.new('RGBA', (16, 16)).save(self.root / 'empty.png')
        self.write_manifest(fallback_clothes='empty.png')
        with self.assertRaisesRegex(ValueError, 'must be visible'):
            export(self.rig, self.manifest, self.poses, self.output)
        self.assertFalse(self.output.exists())

    def test_fallback_path_escape_is_rejected(self):
        self.write_manifest(fallback_clothes='../outside.png')
        with self.assertRaisesRegex(ValueError, 'Unsafe or missing'):
            export(self.rig, self.manifest, self.poses, self.output)
        self.assertFalse(self.output.exists())

    def test_missing_fallback_is_rejected(self):
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, 'Visible clothes'):
            export(self.rig, self.manifest, self.poses, self.output)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
