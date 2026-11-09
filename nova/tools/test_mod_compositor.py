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


    def test_rejects_fully_transparent_base_body(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (0, 0, 0, 0)).save(root / 'body.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({'canvas': [8, 8], 'layers': {'body': 'body.png'}}))
            with self.assertRaisesRegex(ValueError, 'fully transparent'):
                render(manifest, root / 'out.png')
            self.assertFalse((root / 'out.png').exists())


    def test_fallback_clothes_for_missing_and_empty_mod_clothes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (100, 30, 40, 255)).save(root / 'body.png')
            Image.new('RGBA', (8, 8), (0, 0, 0, 0)).save(root / 'clothes.png')
            Image.new('RGBA', (8, 8), (10, 180, 30, 255)).save(root / 'fallback.png')
            manifest = root / 'mod.json'
            for index, clothes in enumerate((None, 'clothes.png')):
                layers = {'body': 'body.png'}
                if clothes:
                    layers['clothes'] = clothes
                manifest.write_text(json.dumps({
                    'canvas': [8, 8], 'layers': layers, 'fallback_clothes': 'fallback.png'
                }))
                out = root / f'out{index}.png'
                render(manifest, out)
                with Image.open(out) as result:
                    self.assertEqual(result.getpixel((4, 4)), (10, 180, 30, 255))

    def test_rejects_fallback_path_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (100, 30, 40, 255)).save(root / 'body.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({
                'canvas': [8, 8], 'layers': {'body': 'body.png'},
                'fallback_clothes': '../outside.png'
            }))
            with self.assertRaisesRegex(ValueError, 'inside the MOD folder'):
                render(manifest, root / 'out.png')


    def test_transparent_layers_with_hidden_rgb_are_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (100, 30, 40, 255)).save(root / 'body.png')
            # RGB may be nonzero under zero alpha after editing or export.
            Image.new('RGBA', (8, 8), (255, 0, 0, 0)).save(root / 'clothes.png')
            Image.new('RGBA', (8, 8), (255, 0, 0, 0)).save(root / 'eyes.png')
            Image.new('RGBA', (8, 8), (10, 180, 30, 255)).save(root / 'fallback.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({
                'canvas': [8, 8],
                'layers': {'body': 'body.png', 'clothes': 'clothes.png', 'eyes': 'eyes.png'},
                'fallback_clothes': 'fallback.png'
            }))
            out = root / 'out.png'
            render(manifest, out)
            with Image.open(out) as result:
                self.assertEqual(result.getpixel((4, 4)), (10, 180, 30, 255))

    def test_rejects_invisible_body_with_hidden_rgb(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (255, 0, 0, 0)).save(root / 'body.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({'canvas': [8, 8], 'layers': {'body': 'body.png'}}))
            with self.assertRaisesRegex(ValueError, 'fully transparent'):
                render(manifest, root / 'out.png')
            self.assertFalse((root / 'out.png').exists())

    def test_rejects_transparent_fallback_clothes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new('RGBA', (8, 8), (100, 30, 40, 255)).save(root / 'body.png')
            Image.new('RGBA', (8, 8), (255, 0, 0, 0)).save(root / 'fallback.png')
            manifest = root / 'mod.json'
            manifest.write_text(json.dumps({
                'canvas': [8, 8], 'layers': {'body': 'body.png'},
                'fallback_clothes': 'fallback.png'
            }))
            with self.assertRaisesRegex(ValueError, 'Fallback clothes cannot be fully transparent'):
                render(manifest, root / 'out.png')
            self.assertFalse((root / 'out.png').exists())

if __name__ == '__main__':
    unittest.main()
