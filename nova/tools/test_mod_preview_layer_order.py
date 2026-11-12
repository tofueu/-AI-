"""Verify that hair behind the head never paints over facial features."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_preview_rig import export_mod_preview
except ImportError:
    from mod_preview_rig import export_mod_preview


class LayerOrderTests(unittest.TestCase):
    def test_back_hair_stays_behind_face_and_top_covers_body(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mod"
            root.mkdir()
            colors = {
                "body": (255, 0, 0, 255),
                "head": (0, 0, 255, 255),
                "back_hair": (0, 255, 0, 255),
                "eyes": (255, 255, 255, 255),
                "top": (255, 0, 255, 255),
                "bottom": (255, 255, 0, 255),
            }
            for slot, color in colors.items():
                image = Image.new("RGBA", (512, 512))
                image.putpixel((10, 10), color)
                if slot in ("body", "top"):
                    image.putpixel((20, 20), color)
                image.save(root / (slot + ".png"))
            (root / "manifest.json").write_text(json.dumps({
                "style": "chibi",
                "layers": {slot: slot + ".png" for slot in colors},
            }), encoding="utf-8")
            result = Path(tmp) / "preview.png"
            export_mod_preview(root, result)
            with Image.open(result) as image:
                self.assertEqual(image.getpixel((10, 10)), colors["eyes"])
                self.assertEqual(image.getpixel((20, 20)), colors["top"])


if __name__ == "__main__":
    unittest.main()
