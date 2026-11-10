"""Regression coverage for NOVA clothing fallback and unsafe MOD paths."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

try:
    from .create_blank_mod import create_template, SIZES
    from .rig_animator import export
except ImportError:
    from create_blank_mod import create_template, SIZES
    from rig_animator import export


class ClothingFallbackExportTests(unittest.TestCase):
    def _make_body(self, directory, size):
        body = Image.new("RGBA", size)
        ImageDraw.Draw(body).rectangle(
            (size[0] // 4, size[1] // 3, 3 * size[0] // 4,
             4 * size[1] // 5), fill=(180, 140, 220, 255))
        body.save(directory / "body.png")
        path = directory / "mod.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        next(layer for layer in manifest["layers"]
             if layer["slot"] == "body")["visible"] = True
        path.write_text(json.dumps(manifest), encoding="utf-8")
        return path, manifest

    def test_hidden_clothes_use_visible_fallback_in_both_variants(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                directory = create_template(Path(tmp) / variant, variant)
                manifest_path, _ = self._make_body(directory, size)
                output = directory / "preview.png"
                export(directory / "rig.json", manifest_path,
                       directory / "poses.json", output)
                # A point well inside the fallback garment must have its
                # garment color rather than the base body's purple.
                with Image.open(output) as preview:
                    self.assertEqual(preview.convert("RGBA").getpixel(
                        (size[0] // 2, size[1] // 2)), (100, 91, 135, 255))

    def test_missing_fallback_rejects_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = create_template(Path(tmp) / "chibi", "chibi")
            manifest_path, manifest = self._make_body(directory, SIZES["chibi"])
            manifest["fallback_clothes"] = "missing.png"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            output = directory / "preview.png"
            with self.assertRaises(ValueError):
                export(directory / "rig.json", manifest_path,
                       directory / "poses.json", output)
            self.assertFalse(output.exists())

    def test_fallback_cannot_escape_mod_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = create_template(Path(tmp) / "chibi", "chibi")
            manifest_path, manifest = self._make_body(directory, SIZES["chibi"])
            manifest["fallback_clothes"] = "../outside.png"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            Image.new("RGBA", SIZES["chibi"], (255, 0, 0, 255)).save(
                Path(tmp) / "outside.png")
            output = directory / "preview.png"
            with self.assertRaises(ValueError):
                export(directory / "rig.json", manifest_path,
                       directory / "poses.json", output)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
