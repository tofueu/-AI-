"""Security regressions for immutable MOD layer swapping."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_layer_swap import replace_layer
except ImportError:
    from mod_layer_swap import replace_layer


class SafeSwapTests(unittest.TestCase):
    def test_rejects_destination_inside_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'source'
            src.mkdir()
            (src / 'mod.json').write_text(json.dumps({'canvas': [16, 16], 'layers': {}}))
            png = root / 'replacement.png'
            Image.new('RGBA', (16, 16), (1, 2, 3, 255)).save(png)
            with self.assertRaises(ValueError):
                replace_layer(src, 'hair_front', png, src / 'variant')
            self.assertFalse((src / 'variant').exists())

    def test_rejects_reused_filename(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'source'
            src.mkdir()
            (src / 'mod.json').write_text(json.dumps({
                'canvas': [16, 16],
                'layers': {'head': 'head.png', 'hair_front': 'head.png'}
            }))
            png = root / 'replacement.png'
            Image.new('RGBA', (16, 16), (1, 2, 3, 255)).save(png)
            with self.assertRaises(ValueError):
                replace_layer(src, 'hair_front', png, root / 'variant')
            self.assertFalse((root / 'variant').exists())


    def test_rejects_nested_symlink_without_creating_variant(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'source'
            nested = src / 'assets'
            nested.mkdir(parents=True)
            outside = root / 'secret.txt'
            outside.write_text('must not be copied')
            try:
                (nested / 'external.txt').symlink_to(outside)
            except (OSError, NotImplementedError):
                self.skipTest('Symlinks unavailable on this platform')
            (src / 'mod.json').write_text(json.dumps({
                'canvas': [16, 16], 'layers': {}
            }))
            png = root / 'replacement.png'
            Image.new('RGBA', (16, 16), (1, 2, 3, 255)).save(png)
            dest = root / 'variant'
            with self.assertRaisesRegex(ValueError, 'symlinks'):
                replace_layer(src, 'hair_front', png, dest)
            self.assertFalse(dest.exists())

if __name__ == '__main__':
    unittest.main()
