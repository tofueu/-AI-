"""Tests for generated NOVA blank MOD templates."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.create_mod_templates import create_templates, VARIANTS
from nova.tools.mod_slot_resolver import SLOTS


class TemplateTests(unittest.TestCase):
    def test_both_variants_are_rgba_and_transparent(self):
        with tempfile.TemporaryDirectory() as tmp:
            created = create_templates(tmp)
            self.assertEqual(len(created), 2 * (len(SLOTS) + 1))
            for variant, size in VARIANTS.items():
                folder = Path(tmp) / variant
                manifest = json.loads((folder / "manifest.json").read_text())
                self.assertEqual(manifest["canvas"], list(size))
                self.assertEqual(manifest["slots_back_to_front"], list(SLOTS))
                for slot in SLOTS:
                    with Image.open(folder / (slot + ".png")) as img:
                        self.assertEqual(img.mode, "RGBA")
                        self.assertEqual(img.size, size)
                        self.assertIsNone(img.getchannel("A").getbbox())

    def test_refuses_overwrite_without_changing_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            create_templates(tmp, variants=("chibi",))
            target = Path(tmp) / "chibi" / "hair.png"
            original = target.read_bytes()
            with self.assertRaises(FileExistsError):
                create_templates(tmp, variants=("chibi",))
            self.assertEqual(target.read_bytes(), original)

    def test_preflight_prevents_partial_second_variant(self):
        with tempfile.TemporaryDirectory() as tmp:
            create_templates(tmp, variants=("adult",))
            with self.assertRaises(FileExistsError):
                create_templates(tmp)
            self.assertFalse((Path(tmp) / "chibi").exists())

    def test_rejects_unknown_or_duplicate_variants(self):
        with tempfile.TemporaryDirectory() as tmp:
            for variants in (("other",), ("adult", "adult"), ()):
                with self.assertRaises(ValueError):
                    create_templates(tmp, variants=variants)
            self.assertEqual(list(Path(tmp).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
