"""Optional transparent base assets must not be rendered, and originals remain intact."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.mod_outfit import resolve_outfit


class BaseOptionalVisibilityTests(unittest.TestCase):
    def test_transparent_base_hair_hidden_without_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("body.png", "shirt.png"):
                Image.new("RGBA", (4, 4), (50, 20, 10, 255)).save(root / name)
            Image.new("RGBA", (4, 4), (0, 0, 0, 0)).save(root / "hair.png")
            base = [
                {"slot": "body", "file": "body.png"},
                {"slot": "clothing", "file": "shirt.png"},
                {"slot": "hair", "file": "hair.png"},
            ]
            result = resolve_outfit(base, [], source_dir=root)
            hair = next(item for item in result if item["slot"] == "hair")
            self.assertFalse(hair["visible"])
            self.assertNotIn("visible", base[2])
            self.assertTrue((root / "hair.png").exists())

    def test_missing_optional_base_hidden(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("body.png", "shirt.png"):
                Image.new("RGBA", (4, 4), (10, 20, 30, 255)).save(root / name)
            base = [
                {"slot": "body", "file": "body.png"},
                {"slot": "clothing", "file": "shirt.png"},
                {"slot": "hat", "file": "missing.png"},
            ]
            result = resolve_outfit(base, [], source_dir=root)
            self.assertFalse(next(x for x in result if x["slot"] == "hat")["visible"])


if __name__ == "__main__":
    unittest.main()
