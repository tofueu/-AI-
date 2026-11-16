import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.png_mod_animation_pipeline import (
    render_png_mod_directory, export_png_mod_directory_gif,
)


class PngModAnimationPipelineTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (32, 48)
        self.base = {
            slot: Image.new("RGBA", self.canvas, (100, 50, 20, 255))
            for slot in ("body", "head", "top", "bottom", "shoes")
        }
        self.attachments = {
            slot: "root" for slot in (*self.base, "hat", "hair")
        }
        self.poses = [
            {"root": (0.5, 0.5, 0)},
            {"root": (0.6, 0.5, 0)},
        ]

    def test_directory_hat_renders_without_changing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            hat_path = Path(directory) / "hat.png"
            Image.new("RGBA", self.canvas, (0, 255, 0, 255)).save(hat_path)
            frames = render_png_mod_directory(
                self.base, directory, self.attachments, self.poses,
                self.canvas, frames_per_segment=2,
            )
            self.assertEqual(len(frames), 3)
            self.assertEqual(frames[0].getpixel((16, 24)), (0, 255, 0, 255))
            with Image.open(hat_path) as original:
                self.assertEqual(original.getpixel((16, 24)), (0, 255, 0, 255))

    def test_empty_top_keeps_clothing_and_hidden_hat(self):
        with tempfile.TemporaryDirectory() as directory:
            Image.new("RGBA", self.canvas).save(Path(directory) / "top.png")
            Image.new("RGBA", self.canvas, (0, 255, 0, 255)).save(
                Path(directory) / "hat.png")
            frames = render_png_mod_directory(
                self.base, directory, self.attachments, self.poses,
                self.canvas, visibility={"hat": False}, frames_per_segment=2,
            )
            self.assertEqual(frames[0].getpixel((16, 24)), (100, 50, 20, 255))

    def test_directory_gif_export_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "preview.gif"
            export_png_mod_directory_gif(
                self.base, directory, self.attachments, self.poses,
                self.canvas, output, frames_per_segment=2,
            )
            with Image.open(output) as gif:
                self.assertEqual(gif.format, "GIF")
                self.assertGreaterEqual(gif.n_frames, 2)
            with self.assertRaises(FileExistsError):
                export_png_mod_directory_gif(
                    self.base, directory, self.attachments, self.poses,
                    self.canvas, output, frames_per_segment=2,
                )

    def test_invalid_png_is_rejected_before_export(self):
        with tempfile.TemporaryDirectory() as directory:
            Image.new("RGB", self.canvas).save(Path(directory) / "hat.png")
            output = Path(directory) / "preview.gif"
            with self.assertRaisesRegex(ValueError, "matching RGBA PNG"):
                export_png_mod_directory_gif(
                    self.base, directory, self.attachments, self.poses,
                    self.canvas, output,
                )
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
