import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from mod_template import generate, SLOTS, SIZES


class TemplateTests(unittest.TestCase):
    def test_variants_have_editable_png_layers_and_manifest(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                target = Path(tmp) / variant
                generate(target, variant)
                manifest = json.loads((target / 'mod.json').read_text())
                self.assertEqual(manifest['canvas'], list(size))
                self.assertEqual(set(manifest['layers']), set(SLOTS))
                for slot in SLOTS:
                    with Image.open(target / f'{slot}.png') as image:
                        self.assertEqual(image.size, size)
                        self.assertEqual(image.mode, 'RGBA')
                        self.assertEqual(image.getchannel('A').getbbox() is None, slot not in ('body', 'clothes'))
                with self.assertRaises(FileExistsError):
                    generate(target, variant)

    def test_unknown_variant_creates_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'unknown'
            with self.assertRaises(ValueError):
                generate(target, 'unknown')
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
