import tempfile
import unittest
from pathlib import Path
from PIL import Image

try:
    from .rig_gif import export_gif
except ImportError:
    from rig_gif import export_gif


class RigGifTests(unittest.TestCase):
    def test_animation_transparency_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "walk.gif"
            first = Image.new("RGBA", (12, 12))
            second = Image.new("RGBA", (12, 12))
            first.putpixel((2, 3), (255, 0, 0, 255))
            second.putpixel((6, 3), (255, 0, 0, 255))
            self.assertEqual(export_gif([first, second], output, 100), output)
            with Image.open(output) as gif:
                self.assertEqual(gif.n_frames, 2)
                self.assertEqual(gif.info["loop"], 0)
                gif.seek(0)
                self.assertEqual(gif.convert("RGBA").getpixel((0, 0))[3], 0)
                self.assertEqual(gif.convert("RGBA").getpixel((2, 3))[0], 255)
                gif.seek(1)
                self.assertEqual(gif.convert("RGBA").getpixel((6, 3))[0], 255)
            with self.assertRaises(FileExistsError):
                export_gif([first], output)
            self.assertEqual(first.getpixel((2, 3)), (255, 0, 0, 255))

    def test_invalid_frames_and_output(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "out.gif"
            with self.assertRaises(ValueError):
                export_gif([], path)
            with self.assertRaises(ValueError):
                export_gif([Image.new("RGBA", (1, 1)), Image.new("RGBA", (2, 2))], path)
            with self.assertRaises(ValueError):
                export_gif([Image.new("RGBA", (1, 1))], path, duration_ms=0)


if __name__ == "__main__":
    unittest.main()
