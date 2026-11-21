"""Regression tests for transparent NOVA PNG slot export."""
import importlib.util
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

    def test_missing_layer_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'template.svg'
            source.write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
            with self.assertRaisesRegex(ValueError, 'Missing layers'):
                module.render_layers(source, root / 'png')


if __name__ == '__main__':
    unittest.main()
