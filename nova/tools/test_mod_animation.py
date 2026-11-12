"""Integration regression tests for loading a MOD and exporting an animated GIF."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

try:
    from .mod_animation import export_mod_animation
except ImportError:
    from mod_animation import export_mod_animation


KEYFRAMES = [
    {"time": 0, "pose": {"head": [0, 0, 0]}},
    {"time": 0.5, "pose": {"head": [32, 0, 12]}},
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
                    draw = ImageDraw.Draw(im)
                    if name == "head":
                        draw.ellipse((215, 120, 295, 200), fill=(200, 80, 120, 255))
                    else:
                        draw.rectangle((220, 240, 290, 380), fill=(80, 120, 200, 255))
                    im.save(root / (name + ".png"))
                fallback = root / "basic_clothing"
                fallback.mkdir()
                for slot in ("top", "bottom"):
                    clothing = Image.new("RGBA", size, (0, 0, 0, 0))
                    ImageDraw.Draw(clothing).rectangle(
                        (225, 270 if slot == "top" else 330, 285, 325 if slot == "top" else 390),
                        fill=(60, 80, 110, 255))
                    clothing.save(fallback / (slot + ".png"))
                originals = {p.name: p.read_bytes() for p in root.glob("*.png")}
                destination = root / "preview.gif"
                export_mod_animation(root, KEYFRAMES, 6, destination, duration_ms=120, fallback_directory=fallback)
                self.assertTrue(destination.is_file())
                with Image.open(destination) as result:
                    self.assertEqual(result.n_frames, 6)
                    self.assertEqual(result.size, size)
                    frames = []
                    for index in range(result.n_frames):
                        result.seek(index)
                        frames.append(result.convert("RGBA").copy())
                    self.assertTrue(
                        any(ImageChops.difference(frames[0], frame).getbbox() is not None
                            for frame in frames[1:]),
                        "Pose keyframes must produce visible GIF motion")
                self.assertEqual(
                    {p.name: p.read_bytes() for p in root.glob("*.png")}, originals)
                with self.assertRaises(FileExistsError):
                    export_mod_animation(root, KEYFRAMES, 6, destination, fallback_directory=fallback)

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
