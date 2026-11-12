"""Strict clothing policy must never export an undressed MOD by accident."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_compositor import render
except ImportError:
    from mod_compositor import render


class RequiredClothingTests(unittest.TestCase):
    def test_missing_clothing_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (100, 100, 100, 255)).save(root / "body.png")
            manifest = root / "manifest.json"
            output = root / "result.png"
            for clothing in (None, "transparent.png"):
                if clothing:
                    Image.new("RGBA", (8, 8), (0, 0, 0, 0)).save(root / clothing)
                manifest.write_text(json.dumps({
                    "canvas": [8, 8],
                    "layers": {"body": "body.png", "clothes": clothing},
                    "require_clothes": True
                }), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "Clothing is required"):
                    render(manifest, output)
                self.assertFalse(output.exists())

    def test_fallback_satisfies_requirement(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (100, 100, 100, 255)).save(root / "body.png")
            Image.new("RGBA", (8, 8), (40, 50, 60, 255)).save(root / "shirt.png")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "canvas": [8, 8], "layers": {"body": "body.png"},
                "fallback_clothes": "shirt.png", "require_clothes": True
            }), encoding="utf-8")
            output = root / "result.png"
            render(manifest, output)
            with Image.open(output) as image:
                self.assertEqual(image.convert("RGBA").getpixel((0, 0)), (40, 50, 60, 255))

    def test_policy_flag_must_be_boolean(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "canvas": [8, 8], "layers": {"body": "body.png"},
                "require_clothes": "false"
            }), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "must be a boolean"):
                render(manifest, root / "result.png")


if __name__ == "__main__":
    unittest.main()
