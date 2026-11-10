"""Regression tests for the blank MOD template generator."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .create_blank_mod import create_template, SLOTS, SIZES
except ImportError:
    from create_blank_mod import create_template, SLOTS, SIZES


class TemplateTests(unittest.TestCase):
    def test_both_variants(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                dest = Path(tmp) / variant
                create_template(dest, variant)
                rig = json.loads((dest / 'rig.json').read_text())
                mod = json.loads((dest / 'mod.json').read_text())
                self.assertEqual(tuple(rig['canvas']), size)
                self.assertEqual({entry['slot'] for entry in mod['layers']}, set(SLOTS))
                for slot in (*SLOTS, 'fallback_clothes'):
                    with Image.open(dest / f'{slot}.png') as img:
                        self.assertEqual(img.size, size)
                        self.assertEqual(img.mode, 'RGBA')
                        self.assertIsNone(img.getchannel('A').getbbox())

    def test_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / 'mod'
            create_template(dest, 'chibi')
            with self.assertRaises(FileExistsError):
                create_template(dest, 'chibi')

    def test_unknown_variant(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                create_template(Path(tmp) / 'invalid', 'unknown')


if __name__ == '__main__':
    unittest.main()
