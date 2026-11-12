"""Regression coverage for NOVA GIF palette transparency and destination validation."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .rig_gif import export_gif
except ImportError:
    from rig_gif import export_gif


class GifPaletteRegressionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_transparent_background_and_visible_color_survive_round_trip(self):
        frame = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
        frame.putpixel((12, 12), (240, 120, 60, 255))
        frame.putpixel((13, 12), (240, 120, 60, 200))
        frame.putpixel((14, 12), (240, 120, 60, 30))
        path = export_gif([frame], self.root / "palette.gif")
        with Image.open(path) as gif:
            rgba = gif.convert("RGBA")
            self.assertEqual(rgba.getpixel((0, 0))[3], 0)
            self.assertEqual(rgba.getpixel((12, 12)), (240, 120, 60, 255))
            self.assertEqual(rgba.getpixel((13, 12)), (240, 120, 60, 255))
            self.assertEqual(rgba.getpixel((14, 12))[3], 0)

    def test_invalid_extension_and_missing_parent_do_not_create_output(self):
        frame = Image.new("RGBA", (8, 8), (200, 80, 60, 255))
        wrong = self.root / "preview.png"
        with self.assertRaises(ValueError):
            export_gif([frame], wrong)
        self.assertFalse(wrong.exists())
        missing = self.root / "missing" / "preview.gif"
        with self.assertRaises(FileNotFoundError):
            export_gif([frame], missing)
        self.assertFalse(missing.exists())

    def test_source_palette_and_metadata_are_unchanged(self):
        frame = Image.new("RGBA", (8, 8), (30, 40, 50, 255))
        frame.info["nova_source"] = "untouched"
        original = frame.tobytes()
        export_gif([frame], self.root / "original.gif")
        self.assertEqual(frame.mode, "RGBA")
        self.assertEqual(frame.tobytes(), original)
        self.assertEqual(frame.info["nova_source"], "untouched")


if __name__ == "__main__":
    unittest.main()
