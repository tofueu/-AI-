"""Regression tests for both NOVA artist starter templates.

Run: python -m unittest nova.tools.test_create_mod_template
"""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import SIZES, SLOTS, create_template


class TemplateTests(unittest.TestCase):
    def test_both_variants_are_editable_and_transparent(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as root:
                folder = create_template(Path(root) / variant, variant)
                manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
                rig = json.loads((folder / "rig.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["variant"], variant)
                self.assertEqual(manifest["canvas"], list(size))
                self.assertTrue(manifest["require_clothes"])
                self.assertEqual(set(manifest["layers"]), set(SLOTS))
                self.assertEqual(rig["coordinate_system"], "normalized_xy")
                self.assertTrue(rig["joints"])
                for point in rig["joints"].values():
                    self.assertEqual(len(point), 2)
                    self.assertTrue(all(0 <= n <= 1 for n in point))
                for slot, filename in manifest["layers"].items():
                    with self.subTest(slot=slot), Image.open(folder / filename) as image:
                        self.assertEqual(image.mode, "RGBA")
                        self.assertEqual(image.size, size)
                        self.assertIsNone(image.getbbox())

    def test_refuses_nonempty_directory_without_changing_existing_art(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            original = folder / "body.png"
            original.write_bytes(b"artist-owned-content")
            with self.assertRaises(FileExistsError):
                create_template(folder, "chibi")
            self.assertEqual(original.read_bytes(), b"artist-owned-content")
            self.assertEqual(sorted(p.name for p in folder.iterdir()), ["body.png"])

    def test_rejects_invalid_variant_without_creating_directory(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "invalid"
            with self.assertRaises(ValueError):
                create_template(target, "other")
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
