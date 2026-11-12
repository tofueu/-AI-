"""Regression tests for mandatory painted clothing or fallback in NOVA MOD loader."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_loader import load_mod
except ImportError:
    from mod_loader import load_mod


class ClothingSafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "mod"
        self.root.mkdir()
        self.fallback = Path(self.tmp.name) / "fallback"
        self.fallback.mkdir()

    def paint(self, root, name, alpha=255):
        Image.new("RGBA", (512, 512), (80, 30, 90, alpha)).save(root / (name + ".png"))

    def manifest(self, names):
        (self.root / "manifest.json").write_text(json.dumps({
            "style": "chibi", "layers": {name: name + ".png" for name in names}
        }), encoding="utf-8")

    def test_missing_clothing_without_fallback_rejected(self):
        self.manifest(("body", "head"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        with self.assertRaisesRegex(ValueError, "Missing clothing"):
            load_mod(self.root)

    def test_transparent_clothing_without_fallback_rejected(self):
        self.manifest(("body", "head", "top", "bottom"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        for name in ("top", "bottom"):
            self.paint(self.root, name, alpha=0)
        with self.assertRaisesRegex(ValueError, "Clothing layer is empty"):
            load_mod(self.root)

    def test_painted_fallback_accepted(self):
        self.manifest(("body", "head", "top", "bottom"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        for name in ("top", "bottom"):
            self.paint(self.root, name, alpha=0)
            self.paint(self.fallback, name)
        blueprint, parts = load_mod(self.root, self.fallback)
        self.assertEqual(blueprint["style"], "chibi")
        self.assertEqual(len(parts), 4)

    def test_invisible_rgb_clothing_uses_painted_fallback(self):
        """Nonzero RGB with alpha zero must still count as transparent."""
        self.manifest(("body", "head", "top", "bottom"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        for name in ("top", "bottom"):
            self.paint(self.root, name, alpha=0)
            self.paint(self.fallback, name, alpha=255)
        _, parts = load_mod(self.root, self.fallback)
        clothes = {part["slot"]: part["image"] for part in parts
                   if part["slot"] in ("top", "bottom")}
        self.assertEqual(set(clothes), {"top", "bottom"})
        for image in clothes.values():
            self.assertEqual(image.getpixel((0, 0))[3], 255)

    def test_invisible_rgb_clothing_without_fallback_rejected(self):
        """RGB data alone must not satisfy mandatory visible clothing."""
        self.manifest(("body", "head", "top", "bottom"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        for name in ("top", "bottom"):
            self.paint(self.root, name, alpha=0)
        with self.assertRaisesRegex(ValueError, "Clothing layer is empty"):
            load_mod(self.root)

    def test_empty_fallback_rejected(self):
        self.manifest(("body", "head"))
        for name in ("body", "head"):
            self.paint(self.root, name)
        for name in ("top", "bottom"):
            self.paint(self.fallback, name, alpha=0)
        with self.assertRaisesRegex(ValueError, "Clothing layer is empty"):
            load_mod(self.root, self.fallback)


if __name__ == "__main__":
    unittest.main()
