"""Tests for MOD static preview, fallback, and source immutability."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_preview import preview_mod
except ImportError:
    from mod_preview import preview_mod

class PreviewTests(unittest.TestCase):
    def test_empty_layers_hidden_and_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'mod'
            source.mkdir()
            (source / 'mod.json').write_text(json.dumps({'canvas': [16, 16], 'layers': [
                {'slot': 'body', 'file': 'body.png'},
                {'slot': 'hair_front', 'file': 'hair.png'},
                {'slot': 'clothes', 'file': 'clothes.png'}]}), encoding='utf-8')
            Image.new('RGBA', (16, 16), (255, 0, 0, 255)).save(source / 'body.png')
            Image.new('RGBA', (16, 16)).save(source / 'hair.png')
            Image.new('RGBA', (16, 16)).save(source / 'clothes.png')
            fallback = root / 'fallback.png'
            Image.new('RGBA', (16, 16), (0, 0, 255, 255)).save(fallback)
            before = {p.name: p.read_bytes() for p in source.iterdir()}
            out = root / 'preview.png'
            self.assertEqual(preview_mod(source, out, fallback_clothes=fallback), ['body', 'fallback_clothes'])
            with Image.open(out) as image:
                self.assertEqual(image.getpixel((0, 0)), (0, 0, 255, 255))
            self.assertEqual(before, {p.name: p.read_bytes() for p in source.iterdir()})
            with self.assertRaises(FileExistsError):
                preview_mod(source, out, fallback_clothes=fallback)

    def test_no_clothes_without_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'mod'
            source.mkdir()
            (source / 'mod.json').write_text(json.dumps({'canvas': [8, 8], 'layers': []}), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'clothing'):
                preview_mod(source, root / 'preview.png')
            self.assertFalse((root / 'preview.png').exists())

if __name__ == '__main__':
    unittest.main()
