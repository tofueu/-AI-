import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from mod_compositor import render


class TestModCompositor(unittest.TestCase):
    def test_empty_slot_and_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (100, 30, 40, 255)).save(root / 'body.png')
            Image.new('RGBA', (8, 8), (0, 0, 0, 0)).save(root / 'eyes.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({'canvas': [8, 8], 'layers': {'body': 'body.png', 'eyes': 'eyes.png'}}))
            out = root / 'out.png'
            render(manifest, out)
            with Image.open(out) as result:
                self.assertEqual(result.getpixel((4, 4)), (100, 30, 40, 255))
            with self.assertRaises(FileExistsError):
                render(manifest, out)

    def test_rejects_missing_body_and_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({'canvas': [8, 8], 'layers': {'eyes': 'eyes.png'}}))
            with self.assertRaises(ValueError):
                render(manifest, root / 'out.png')
            manifest.write_text(json.dumps({'canvas': [8, 8], 'layers': {'body': '../body.png'}}))
            with self.assertRaises(ValueError):
                render(manifest, root / 'out.png')


if __name__ == '__main__':
    unittest.main()
