"""Tests for NOVA MOD pack validation.

Run: python -m unittest nova.tools.test_validate_mod_template
"""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.validate_mod_template import validate_template


class ValidateModTemplateTests(unittest.TestCase):
    def test_both_variants(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as root:
                folder = create_template(Path(root) / variant, variant)
                self.assertEqual(validate_template(folder)["layers"], 8)

    def test_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "chibi")
            path = folder / "manifest.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            data["layers"]["hair_front"] = "../outside.png"
            path.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                validate_template(folder)

    def test_rejects_wrong_canvas_png(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "chibi")
            Image.new("RGBA", (8, 8)).save(folder / "eyes.png")
            with self.assertRaises(ValueError):
                validate_template(folder)

    def test_rejects_invalid_joint(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "adult")
            path = folder / "rig.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            data["joints"]["head"] = [2.0, 0.2]
            path.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                validate_template(folder)

    def test_rejects_disabled_clothing_requirement(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "adult")
            path = folder / "manifest.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            data["require_clothes"] = False
            path.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                validate_template(folder)


if __name__ == "__main__":
    unittest.main()
