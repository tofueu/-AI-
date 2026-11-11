"""Regression checks for transparent clothing and fallback assets."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_loader import load_mod
except ImportError:
    from mod_loader import load_mod


class ClothingFallbackTests(unittest.TestCase):
    def test_blank_top_uses_fallback_without_changing_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mod = root / "mod"
            fallback = root / "fallback"
            mod.mkdir()
            fallback.mkdir()
            size = (512, 512)
            for name in ("body", "head"):
                Image.new("RGBA", size, (100, 40, 40, 255)).save(mod / (name + ".png"))
            Image.new("RGBA", size, (0, 0, 0, 0)).save(mod / "top.png")
            Image.new("RGBA", size, (0, 90, 220, 255)).save(fallback / "top.png")
            (mod / "manifest.json").write_text(json.dumps({
                "style": "chibi",
                "layers": {"body": "body.png", "head": "head.png", "top": "top.png"}
            }), encoding="utf-8")
            _, parts = load_mod(mod, fallback)
            self.assertEqual(len(parts), 3)
            self.assertEqual(parts[-1]["image"].getpixel((0, 0)), (0, 90, 220, 255))
            with Image.open(mod / "top.png") as original:
                self.assertIsNone(original.getbbox())

    def test_fallback_size_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mod = root / "mod"
            fallback = root / "fallback"
            mod.mkdir()
            fallback.mkdir()
            for name in ("body", "head"):
                Image.new("RGBA", (512, 512), (1, 2, 3, 255)).save(mod / (name + ".png"))
            Image.new("RGBA", (512, 512)).save(mod / "top.png")
            Image.new("RGBA", (16, 16), (1, 2, 3, 255)).save(fallback / "top.png")
            (mod / "manifest.json").write_text(json.dumps({
                "style": "chibi",
                "layers": {"body": "body.png", "head": "head.png", "top": "top.png"}
            }), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Fallback canvas mismatch"):
                load_mod(mod, fallback)


if __name__ == "__main__":
    unittest.main()
