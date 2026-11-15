"""Image-backed tests for MOD outfit fallback; run with python -m unittest."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.mod_outfit import resolve_outfit


class ImageOutfitTests(unittest.TestCase):
    def test_transparent_mod_clothing_uses_base(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, alpha in (("body.png", 255), ("clothes.png", 255),
                                ("empty.png", 0), ("dress.png", 255)):
                Image.new("RGBA", (4, 4), (100, 50, 80, alpha)).save(root / name)
            base = [{"slot": "body", "file": "body.png"},
                    {"slot": "clothing", "file": "clothes.png"}]
            mod = [{"slot": "clothing", "file": "empty.png"}]
            result = resolve_outfit(base, mod, source_dir=root)
            self.assertEqual(next(x["file"] for x in result if x["slot"] == "clothing"), "clothes.png")
            self.assertEqual(mod[0]["file"], "empty.png")
            mod[0]["file"] = "dress.png"
            result = resolve_outfit(base, mod, source_dir=root)
            self.assertEqual(next(x["file"] for x in result if x["slot"] == "clothing"), "dress.png")

    def test_missing_or_unsafe_required_mod_uses_base(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("body.png", "clothes.png"):
                Image.new("RGBA", (2, 2), (255, 255, 255, 255)).save(root / name)
            base = [{"slot": "body", "file": "body.png"},
                    {"slot": "clothing", "file": "clothes.png"}]
            for bad in ("missing.png", "../outside.png", ""):
                result = resolve_outfit(base, [{"slot": "clothing", "file": bad}], source_dir=root)
                self.assertEqual(next(x["file"] for x in result if x["slot"] == "clothing"), "clothes.png")

    def test_transparent_base_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new("RGBA", (2, 2), (255, 255, 255, 0)).save(root / "body.png")
            Image.new("RGBA", (2, 2), (255, 255, 255, 255)).save(root / "clothes.png")
            with self.assertRaises(ValueError):
                resolve_outfit([{"slot": "body", "file": "body.png"},
                                {"slot": "clothing", "file": "clothes.png"}], [], source_dir=root)


if __name__ == "__main__":
    unittest.main()
