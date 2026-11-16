import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.mod_animation_pipeline import render_mod_animation, export_mod_animation_gif


class ModAnimationPipelineTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (32, 48)
        self.base = {slot: Image.new("RGBA", self.canvas, (100, 50, 20, 255))
                     for slot in ("body", "head", "top", "bottom", "shoes")}
        self.attachments = {slot: "root" for slot in (*self.base, "hat", "hair")}
        self.poses = [
            {"root": (0.5, 0.5, 0)},
            {"root": (0.6, 0.5, 0)},
        ]

    def test_empty_clothing_mod_keeps_official_fallback(self):
        frames = render_mod_animation(
            self.base, {"top": Image.new("RGBA", self.canvas)},
            self.attachments, self.poses, self.canvas, frames_per_segment=2)
        self.assertEqual(len(frames), 3)
        self.assertEqual(frames[0].getpixel((16, 24)), (100, 50, 20, 255))

    def test_hidden_optional_layer_does_not_cover_character(self):
        hat = Image.new("RGBA", self.canvas, (0, 255, 0, 255))
        frames = render_mod_animation(
            self.base, {"hat": hat}, self.attachments, self.poses,
            self.canvas, visibility={"hat": False}, frames_per_segment=2)
        self.assertEqual(frames[0].getpixel((16, 24)), (100, 50, 20, 255))
        self.assertEqual(hat.getpixel((16, 24)), (0, 255, 0, 255))

    def test_missing_attachment_rejected(self):
        with self.assertRaisesRegex(ValueError, "missing joint attachments"):
            render_mod_animation(self.base, None, {}, self.poses, self.canvas)

    def test_export_creates_gif_without_overwriting(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "nova.gif"
            export_mod_animation_gif(
                self.base, None, self.attachments, self.poses,
                self.canvas, target, frames_per_segment=2)
            with Image.open(target) as gif:
                self.assertEqual(gif.format, "GIF")
                self.assertGreaterEqual(gif.n_frames, 2)
            with self.assertRaises(FileExistsError):
                export_mod_animation_gif(
                    self.base, None, self.attachments, self.poses,
                    self.canvas, target, frames_per_segment=2)


if __name__ == "__main__":
    unittest.main()
