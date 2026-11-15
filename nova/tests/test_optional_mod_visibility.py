"""Optional MOD assets with no drawable pixels must be hidden, not removed."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.mod_outfit import resolve_outfit


class OptionalLayerVisibilityTests(unittest.TestCase):
    def test_transparent_optional_mod_is_hidden_without_mutating_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for filename in ("body.png", "shirt.png"):
                Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(root / filename)
            Image.new("RGBA", (4, 4), (0, 0, 0, 0)).save(root / "hair.png")
            base = [{"slot": "body", "file": "body.png"}, {"slot": "clothing", "file": "shirt.png"}]
            mod = [{"slot": "hair", "file": "hair.png"}]
            resolved = resolve_outfit(base, mod, source_dir=root)
            hair = next(layer for layer in resolved if layer["slot"] == "hair")
            self.assertFalse(hair["visible"])
            self.assertNotIn("visible", mod[0])
            self.assertTrue((root / "hair.png").exists())

    def test_opaque_optional_mod_remains_visible(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for filename in ("body.png", "shirt.png", "hair.png"):
                Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(root / filename)
            base = [{"slot": "body", "file": "body.png"}, {"slot": "clothing", "file": "shirt.png"}]
            resolved = resolve_outfit(base, [{"slot": "hair", "file": "hair.png"}], source_dir=root)
            self.assertTrue(next(layer for layer in resolved if layer["slot"] == "hair").get("visible", True))


if __name__ == "__main__":
    unittest.main()
