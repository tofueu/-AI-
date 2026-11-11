"""Regression tests for MOD readiness, including blank whiteboards and clothing fallback."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_inspector import inspect_mod
except ImportError:
    from mod_inspector import inspect_mod


class ModInspectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "mod"
        self.root.mkdir()
        (self.root / "manifest.json").write_text(json.dumps({
            "style": "chibi",
            "layers": {k: k + ".png" for k in ("body", "head", "top", "bottom")}
        }), encoding="utf-8")

    def paint(self, name, size=(512, 512), color=(1, 2, 3, 255), directory=None):
        Image.new("RGBA", size, color).save((directory or self.root) / (name + ".png"))

    def test_blank_whiteboard_is_not_ready(self):
        for name in ("body", "head", "top", "bottom"):
            self.paint(name, color=(0, 0, 0, 0))
        result = inspect_mod(self.root)
        self.assertFalse(result["ready"])
        self.assertEqual(result["slots"]["body"], "empty")

    def test_painted_character_and_clothes_ready(self):
        for name in ("body", "head", "top", "bottom"):
            self.paint(name)
        self.assertTrue(inspect_mod(self.root)["ready"])

    def test_fallback_clothing(self):
        for name in ("body", "head"):
            self.paint(name)
        fallback = Path(self.temp.name) / "fallback"
        fallback.mkdir()
        for name in ("top", "bottom"):
            self.paint(name, directory=fallback)
        result = inspect_mod(self.root, fallback)
        self.assertTrue(result["ready"])
        self.assertEqual(result["slots"]["top"], "fallback")

    def test_wrong_size_is_rejected(self):
        for name in ("body", "head", "top", "bottom"):
            self.paint(name)
        self.paint("head", size=(32, 32))
        result = inspect_mod(self.root)
        self.assertFalse(result["ready"])
        self.assertEqual(result["slots"]["head"], "wrong_size")

    def test_path_escape_rejected(self):
        manifest = json.loads((self.root / "manifest.json").read_text())
        manifest["layers"]["head"] = "../outside.png"
        (self.root / "manifest.json").write_text(json.dumps(manifest))
        with self.assertRaises(ValueError):
            inspect_mod(self.root)


if __name__ == "__main__":
    unittest.main()
