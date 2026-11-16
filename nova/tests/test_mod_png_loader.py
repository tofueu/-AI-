import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.mod_png_loader import load_mod_png_slots
from nova.tools.mod_slot_resolver import resolve_mod_layers


class ModPngLoaderTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (16, 24)
        self.base = {name: Image.new("RGBA", self.canvas, (100, 50, 20, 255))
                     for name in ("body", "head", "top", "bottom", "shoes")}

    def test_load_slot_and_preserve_original(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "hair.png"
            Image.new("RGBA", self.canvas, (10, 20, 30, 255)).save(path)
            layers = load_mod_png_slots(folder, self.canvas)
            layers["hair"].putpixel((0, 0), (0, 0, 0, 0))
            with Image.open(path) as original:
                self.assertEqual(original.getpixel((0, 0)), (10, 20, 30, 255))

    def test_missing_clothing_uses_base(self):
        with tempfile.TemporaryDirectory() as folder:
            layers = load_mod_png_slots(folder, self.canvas)
            resolved, visible = resolve_mod_layers(self.base, layers, canvas=self.canvas)
            self.assertEqual(resolved["top"].getpixel((0, 0)), (100, 50, 20, 255))
            self.assertTrue(visible["top"])

    def test_reject_wrong_size(self):
        with tempfile.TemporaryDirectory() as folder:
            Image.new("RGBA", (2, 2)).save(Path(folder) / "head.png")
            with self.assertRaisesRegex(ValueError, "matching RGBA PNG"):
                load_mod_png_slots(folder, self.canvas)

    def test_reject_rgb_png(self):
        with tempfile.TemporaryDirectory() as folder:
            Image.new("RGB", self.canvas).save(Path(folder) / "head.png")
            with self.assertRaisesRegex(ValueError, "matching RGBA PNG"):
                load_mod_png_slots(folder, self.canvas)

    def test_ignores_unknown_file(self):
        with tempfile.TemporaryDirectory() as folder:
            Image.new("RGBA", self.canvas).save(Path(folder) / "unrelated.png")
            self.assertEqual(load_mod_png_slots(folder, self.canvas), {})


if __name__ == "__main__":
    unittest.main()
