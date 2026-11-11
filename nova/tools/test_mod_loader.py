"""MOD loader regression tests using isolated temporary image assets."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_loader import load_mod
except ImportError:
    from mod_loader import load_mod


class ModLoaderTests(unittest.TestCase):
    def make_mod(self, root, style="chibi", layers=None):
        layers = layers or {"body": "body.png", "head": "head.png"}
        (root / "manifest.json").write_text(json.dumps({"style": style, "layers": layers}), encoding="utf-8")
        size = (512, 512) if style == "chibi" else (512, 768)
        for name in ("body", "head"):
            Image.new("RGBA", size, (100, 20, 80, 255)).save(root / (name + ".png"))

    def test_both_styles(self):
        for style in ("chibi", "adult"):
            with self.subTest(style=style), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                self.make_mod(root, style)
                blueprint, parts = load_mod(root)
                self.assertEqual(blueprint["style"], style)
                self.assertEqual(len(parts), 2)

    def test_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_mod(root, layers={"body": "../escape.png", "head": "head.png"})
            with self.assertRaises(ValueError):
                load_mod(root)

    def test_blank_optional_hidden(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_mod(root)
            Image.new("RGBA", (512, 512)).save(root / "hat.png")
            self.make_mod(root, layers={"body": "body.png", "head": "head.png", "hat": "hat.png"})
            _, parts = load_mod(root)
            self.assertEqual(len(parts), 2)

    def test_missing_required_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_mod(root, layers={"body": "body.png"})
            with self.assertRaises(ValueError):
                load_mod(root)


if __name__ == "__main__":
    unittest.main()
