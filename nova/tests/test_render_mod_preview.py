"""Regression coverage for static MOD compositing and safe export."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.render_mod_preview import render_preview, export_preview


def solid(color, size=(16, 16)):
    return Image.new("RGBA", size, color)


class ModPreviewTests(unittest.TestCase):
    def setUp(self):
        self.base = {
            "body": solid((30, 30, 30, 255)),
            "head": solid((40, 40, 40, 255)),
            "top": solid((200, 0, 0, 255)),
            "bottom": solid((0, 200, 0, 255)),
            "shoes": solid((0, 0, 200, 255)),
        }

    def test_transparent_clothing_mod_uses_base(self):
        mod = {"shoes": solid((0, 0, 0, 0))}
        result = render_preview(self.base, mod, canvas=(16, 16))
        self.assertEqual(result.getpixel((0, 0)), (0, 0, 200, 255))

    def test_hidden_optional_layer_does_not_cover_base(self):
        mod = {"hat": solid((255, 255, 0, 255))}
        result = render_preview(self.base, mod, canvas=(16, 16), visibility={"hat": False})
        self.assertEqual(result.getpixel((0, 0)), (0, 0, 200, 255))

    def test_visible_optional_layer_is_composited(self):
        mod = {"hat": solid((255, 255, 0, 255))}
        result = render_preview(self.base, mod, canvas=(16, 16))
        self.assertEqual(result.getpixel((0, 0)), (255, 255, 0, 255))

    def test_export_does_not_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "preview.png"
            export_preview(path, self.base, canvas=(16, 16))
            original = path.read_bytes()
            with self.assertRaises(FileExistsError):
                export_preview(path, self.base, canvas=(16, 16))
            self.assertEqual(path.read_bytes(), original)

    def test_symlinked_parent_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            real = root / "real"
            real.mkdir()
            alias = root / "alias"
            try:
                alias.symlink_to(real, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("symlink unavailable")
            with self.assertRaisesRegex(ValueError, "symlink"):
                export_preview(alias / "preview.png", self.base, canvas=(16, 16))
            self.assertEqual(list(real.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
