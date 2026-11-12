"""Reject unsafe clothing paths even when fallback clothing exists."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_compositor import render
except ImportError:
    from mod_compositor import render


class ClothingPathValidationTests(unittest.TestCase):
    def test_invalid_clothing_path_never_falls_back(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (120, 90, 80, 255)).save(root / "body.png")
            Image.new("RGBA", (8, 8), (50, 60, 70, 255)).save(root / "fallback.png")
            for bad in ("../outside.png", "clothes.jpg", 42):
                with self.subTest(bad=bad):
                    manifest = root / "manifest.json"
                    manifest.write_text(json.dumps({
                        "canvas": [8, 8],
                        "layers": {"body": "body.png", "clothes": bad},
                        "fallback_clothes": "fallback.png"
                    }), encoding="utf-8")
                    output = root / "output.png"
                    with self.assertRaises(ValueError):
                        render(manifest, output)
                    self.assertFalse(output.exists())

    def test_transparent_clothes_use_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (120, 90, 80, 255)).save(root / "body.png")
            Image.new("RGBA", (8, 8), (0, 0, 0, 0)).save(root / "clothes.png")
            Image.new("RGBA", (8, 8), (50, 60, 70, 255)).save(root / "fallback.png")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "canvas": [8, 8],
                "layers": {"body": "body.png", "clothes": "clothes.png"},
                "fallback_clothes": "fallback.png"
            }), encoding="utf-8")
            output = root / "output.png"
            render(manifest, output)
            with Image.open(output) as result:
                self.assertEqual(result.convert("RGBA").getpixel((0, 0)), (50, 60, 70, 255))


if __name__ == "__main__":
    unittest.main()
