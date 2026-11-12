"""Regression checks for transparent NOVA GIF export."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .rig_gif import export_gif
except ImportError:
    from rig_gif import export_gif


class GifTransparencyTests(unittest.TestCase):
    def test_transparent_background_survives_all_frames(self):
        with tempfile.TemporaryDirectory() as tmp:
            frames = []
            for x in (2, 8, 14):
                frame = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
                for px in range(x, x + 4):
                    for py in range(8, 12):
                        frame.putpixel((px, py), (150, 90, 210, 255))
                frames.append(frame)
            output = Path(tmp) / "moving.gif"
            self.assertEqual(export_gif(frames, output, duration_ms=120), output)
            with Image.open(output) as gif:
                self.assertEqual(gif.n_frames, 3)
                for i in range(3):
                    gif.seek(i)
                    rgba = gif.convert("RGBA")
                    self.assertEqual(rgba.getpixel((0, 0))[3], 0)
                    self.assertEqual(rgba.getpixel((2 + i * 6, 9))[3], 255)
                    self.assertEqual(rgba.getpixel((2 + i * 6, 9))[:3], (150, 90, 210))
            with self.assertRaises(FileExistsError):
                export_gif(frames, output)


if __name__ == "__main__":
    unittest.main()
