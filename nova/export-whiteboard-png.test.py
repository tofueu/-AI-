"""Regression tests for transparent NOVA PNG slot export."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parent / 'tools' / 'export-whiteboard-png.py'
spec = importlib.util.spec_from_file_location('nova_png_export', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PNGExportTests(unittest.TestCase):
    def test_blank_layers_are_transparent(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS)
                + '</svg>', encoding='utf-8')
            files = module.render_layers(source, root / 'png')
            self.assertEqual(len(files), 17)
            for file in files:
                with Image.open(file) as image:
                    self.assertEqual(image.size, (32, 32))
                    self.assertEqual(image.mode, 'RGBA')
                    self.assertIsNone(image.getbbox())

    def test_manifest_tracks_blank_and_painted_slots(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                '<g id="body_base"><rect width="8" height="8" fill="red"/></g>'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS if slot != 'body_base')
                + '</svg>', encoding='utf-8')
            module.render_layers(source, root / 'png')
            raw_manifest = (root / 'png' / 'layers.json').read_text(encoding='utf-8')
            self.assertTrue(raw_manifest.endswith('\n'))
            self.assertFalse(raw_manifest.endswith('\\n'))
            manifest = json.loads(raw_manifest)
            self.assertEqual(manifest['schema_version'], 1)
            self.assertEqual([x['name'] for x in manifest['slots']], module.SLOTS)
            self.assertFalse(manifest['slots'][0]['empty'])
            self.assertTrue(manifest['slots'][1]['empty'])
            self.assertEqual(manifest['slots'][0]['width'], 32)
            self.assertEqual(manifest['slots'][0]['file'], 'body_base.png')

    def test_inherited_transform_and_defs_are_preserved(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                '<defs><clipPath id="clip"><rect x="0" y="0" width="5" height="5"/></clipPath></defs>'
                '<g transform="translate(10,0)">'
                '<g id="body_base" clip-path="url(#clip)">'
                '<rect x="0" y="0" width="20" height="20" fill="red"/>'
                '</g></g>'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS if slot != 'body_base')
                + '</svg>', encoding='utf-8')
            files = module.render_layers(source, root / 'png')
            with Image.open(files[0]) as image:
                self.assertEqual(image.getpixel((12, 2)), (255, 0, 0, 255))
                self.assertEqual(image.getpixel((2, 2))[3], 0)
                self.assertEqual(image.getpixel((17, 2))[3], 0)

    def test_nested_definitions_are_preserved(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                '<g id="resources"><defs><clipPath id="nested-clip">'
                '<rect x="0" y="0" width="5" height="5"/>'
                '</clipPath></defs></g>'
                '<g id="body_base" clip-path="url(#nested-clip)">'
                '<rect width="20" height="20" fill="red"/></g>'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS if slot != 'body_base')
                + '</svg>', encoding='utf-8')
            files = module.render_layers(source, root / 'png')
            with Image.open(files[0]) as image:
                self.assertEqual(image.getpixel((2, 2)), (255, 0, 0, 255))
                self.assertEqual(image.getpixel((10, 10))[3], 0)

    def test_nested_slots_export_separately(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                '<g id="body_base"><rect width="8" height="8" fill="red"/>'
                '<g id="eyes"><rect x="16" width="8" height="8" fill="blue"/></g></g>'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS
                          if slot not in ('body_base', 'eyes'))
                + '</svg>', encoding='utf-8')
            files = module.render_layers(source, root / 'png')
            with Image.open(files[0]) as body:
                self.assertEqual(body.getpixel((2, 2)), (255, 0, 0, 255))
                self.assertEqual(body.getpixel((18, 2))[3], 0)
            with Image.open(root / 'png' / 'eyes.png') as eyes:
                self.assertEqual(eyes.getpixel((18, 2)), (0, 0, 255, 255))
                self.assertEqual(eyes.getpixel((2, 2))[3], 0)

    def test_duplicate_layer_rejected_without_writing_pngs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'duplicate.svg'
            source.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">'
                + ''.join(f'<g id="{slot}"/>' for slot in module.SLOTS)
                + '<g id="eyes"/></svg>', encoding='utf-8')
            destination = root / 'png'
            with self.assertRaisesRegex(ValueError, 'Duplicate layer: eyes'):
                module.render_layers(source, destination)
            self.assertFalse(destination.exists())

    def test_invalid_root_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'invalid.svg'
            source.write_text('<html xmlns="http://www.w3.org/1999/xhtml"/>',
                              encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Expected SVG root'):
                module.render_layers(source, root / 'png')

    def test_missing_layer_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
            with self.assertRaisesRegex(ValueError, 'Missing layers'):
                module.render_layers(source, root / 'png')


if __name__ == '__main__':
    unittest.main()
