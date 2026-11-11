"""Regression checks for PNG whiteboard creation."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_whiteboard import create_whiteboard
    from .rig_templates import create_blueprint
except ImportError:
    from mod_whiteboard import create_whiteboard
    from rig_templates import create_blueprint


class WhiteboardTests(unittest.TestCase):
    def test_both_styles_have_transparent_full_canvas_layers(self):
        for style in ("chibi", "adult"):
            with self.subTest(style=style), tempfile.TemporaryDirectory() as tmp:
                target = create_whiteboard(Path(tmp) / style, style)
                manifest = json.loads((target / "manifest.json").read_text())
                blueprint = create_blueprint(style)
                self.assertEqual(manifest["style"], style)
                self.assertEqual(set(manifest["layers"]), set(blueprint["slots"]))
                for filename in manifest["layers"].values():
                    with Image.open(target / filename) as im:
                        self.assertEqual(im.size, tuple(blueprint["canvas_size"]))
                        self.assertEqual(im.mode, "RGBA")
                        self.assertIsNone(im.getbbox())
                self.assertEqual(json.loads((target / "blueprint.json").read_text()), blueprint)

    def test_existing_destination_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "existing"
            target.mkdir()
            marker = target / "head.png"
            marker.write_bytes(b"original")
            with self.assertRaises(FileExistsError):
                create_whiteboard(target, "chibi")
            self.assertEqual(marker.read_bytes(), b"original")

    def test_invalid_style_creates_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "invalid"
            with self.assertRaises(ValueError):
                create_whiteboard(target, "other")
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
