"""Integration regression tests for loading a MOD and exporting an animated GIF."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .mod_animation import export_mod_animation
except ImportError:
    from mod_animation import export_mod_animation


KEYFRAMES = [
    {"time": 0, "pose": {"head": [0, 0, 0]}},
    {"time": 0.5, "pose": {"head": [8, 0, 8]}},
    {"time": 1, "pose": {"head": [0, 0, 0]}},
]


class ModAnimationTests(unittest.TestCase):
    def test_both_rigs_export_and_preserve_source(self):
        for style, size in (("chibi", (512, 512)), ("adult", (512, 768))):
            with self.subTest(style=style), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "manifest.json").write_text(
                    json.dumps({"style": style, "layers": {
                        "body": "body.png", "head": "head.png"}}), encoding="utf-8")
                for name in ("body", "head"):
                    im = Image.new("RGBA", size, (0, 0, 0, 0))
                    im.putpixel((256, 170), (200, 80, 120, 255))
                    im.save(root / (name + ".png"))
                before = (root / "head.png").read_bytes()
                destination = root / "preview.gif"
                export_mod_animation(root, KEYFRAMES, 6, destination, duration_ms=120)
                self.assertTrue(destination.is_file())
                with Image.open(destination) as result:
                    self.assertEqual(result.n_frames, 6)
                    self.assertEqual(result.size, size)
                self.assertEqual((root / "head.png").read_bytes(), before)
                with self.assertRaises(FileExistsError):
                    export_mod_animation(root, KEYFRAMES, 6, destination)

    def test_missing_required_layer_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "manifest.json").write_text(
                json.dumps({"style": "chibi", "layers": {"body": "missing.png"}}),
                encoding="utf-8")
            destination = root / "preview.gif"
            with self.assertRaises((ValueError, FileNotFoundError)):
                export_mod_animation(root, KEYFRAMES, 6, destination)
            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
