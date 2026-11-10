"""Regression tests for immutable NOVA MOD layer replacement."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_layer_swap import replace_layer
except ImportError:
    from mod_layer_swap import replace_layer


class LayerSwapTests(unittest.TestCase):
    def test_replacement_preserves_source_and_updates_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'source'
            src.mkdir()
            manifest = {'canvas': [32, 32], 'layers': {'body': 'body.png', 'clothes': 'clothes.png'}}
            (src / 'mod.json').write_text(json.dumps(manifest))
            Image.new('RGBA', (32, 32), (50, 50, 50, 255)).save(src / 'body.png')
            Image.new('RGBA', (32, 32), (100, 50, 100, 255)).save(src / 'clothes.png')
            replacement = root / 'hair.png'
            Image.new('RGBA', (32, 32), (200, 100, 200, 255)).save(replacement)
            original = {p.name: p.read_bytes() for p in src.iterdir()}
            dest = replace_layer(src, 'hair_front', replacement, root / 'variant')
            self.assertEqual(json.loads((dest / 'mod.json').read_text())['layers']['hair_front'], 'hair_front.png')
            self.assertEqual((dest / 'hair_front.png').read_bytes(), replacement.read_bytes())
            self.assertEqual(original, {p.name: p.read_bytes() for p in src.iterdir()})
            with self.assertRaises(FileExistsError):
                replace_layer(src, 'hair_front', replacement, dest)

    def test_rejects_wrong_size_without_creating_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'source'
            src.mkdir()
            (src / 'mod.json').write_text(json.dumps({'canvas': [32, 32], 'layers': {}}))
            wrong = root / 'wrong.png'
            Image.new('RGBA', (16, 16)).save(wrong)
            with self.assertRaises(ValueError):
                replace_layer(src, 'eyes', wrong, root / 'variant')
            self.assertFalse((root / 'variant').exists())


if __name__ == '__main__':
    unittest.main()
