"""Integration checks for NOVA clothing fallback and optional transparent layers."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_compositor import render
except ImportError:
    from mod_compositor import render


class ClothingFallbackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.size = (12, 12)
        self.make("body.png", (80, 90, 100, 255))
        self.make("fallback.png", (20, 150, 220, 255))
        self.make("empty.png", (0, 0, 0, 0))
        self.make("eyes.png", (255, 40, 40, 255))

    def make(self, name, color):
        image = Image.new("RGBA", self.size, color)
        if name == "fallback.png":
            image.putpixel((0, 0), (0, 0, 0, 0))
        if name == "eyes.png":
            image = Image.new("RGBA", self.size, (0, 0, 0, 0))
            image.putpixel((6, 6), color)
        image.save(self.root / name)

    def render_case(self, layers, fallback="fallback.png"):
        manifest = self.root / "manifest.json"
        manifest.write_text(json.dumps({
            "canvas": list(self.size),
            "layers": {"body": "body.png", **layers},
            "fallback_clothes": fallback,
        }), encoding="utf-8")
        output = self.root / "out.png"
        render(manifest, output)
        with Image.open(output) as image:
            return image.convert("RGBA").copy()

    def test_missing_clothes_uses_fallback_but_keeps_eyes(self):
        result = self.render_case({"eyes": "eyes.png"})
        self.assertEqual(result.getpixel((0, 0)), (80, 90, 100, 255))
        self.assertEqual(result.getpixel((3, 3)), (20, 150, 220, 255))
        self.assertEqual(result.getpixel((6, 6)), (255, 40, 40, 255))

    def test_fully_transparent_clothes_uses_fallback(self):
        result = self.render_case({"clothes": "empty.png"})
        self.assertEqual(result.getpixel((3, 3)), (20, 150, 220, 255))

    def test_fully_transparent_optional_layers_are_hidden(self):
        result = self.render_case({"hair_front": "empty.png", "mouth": "empty.png"})
        self.assertEqual(result.getpixel((3, 3)), (20, 150, 220, 255))

    def test_transparent_fallback_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Fallback clothes cannot be fully transparent"):
            self.render_case({"clothes": "empty.png"}, fallback="empty.png")

    def test_fallback_cannot_escape_mod_folder(self):
        with self.assertRaises(ValueError):
            self.render_case({}, fallback="../outside.png")


if __name__ == "__main__":
    unittest.main()
