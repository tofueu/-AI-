"""Regression tests for the current rig MOD static PNG preview."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_preview_rig import export_mod_preview
except ImportError:
    from mod_preview_rig import export_mod_preview

class RigPreviewTests(unittest.TestCase):
    def test_chibi_preview_transparency_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "character"
            root.mkdir()
            for slot, color in (("body", (255, 0, 0, 255)),
                                ("head", (0, 0, 255, 255)),
                                ("top", (0, 255, 0, 255)),
                                ("bottom", (255, 255, 0, 255))):
                image = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
                image.putpixel((10, 10), color)
                image.save(root / (slot + ".png"))
            (root / "manifest.json").write_text(json.dumps({
                "style": "chibi", "layers": {s: s + ".png"
                    for s in ("body", "head", "top", "bottom")}
            }), encoding="utf-8")
            output = Path(temp) / "preview.png"
            export_mod_preview(root, output)
            with Image.open(output) as image:
                self.assertEqual(image.size, (512, 512))
                self.assertEqual(image.getpixel((0, 0))[3], 0)
                self.assertEqual(image.getpixel((10, 10)), (255, 255, 0, 255))
            with self.assertRaises(FileExistsError):
                export_mod_preview(root, output)
            with Image.open(root / "body.png") as original:
                self.assertEqual(original.getpixel((10, 10)), (255, 0, 0, 255))

if __name__ == "__main__":
    unittest.main()
