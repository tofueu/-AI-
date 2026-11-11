"""Additional regression coverage for NOVA preview visibility and compositing."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .mod_preview import preview_mod
except ImportError:
    from mod_preview import preview_mod


class PreviewCompositingTests(unittest.TestCase):
    def test_hidden_clothing_uses_fallback_and_preserves_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "mod"
            source.mkdir()
            (source / "mod.json").write_text(json.dumps({
                "canvas": [4, 4],
                "layers": [
                    {"slot": "body", "file": "body.png"},
                    {"slot": "clothes", "file": "clothes.png", "visible": False},
                    {"slot": "eyes", "file": "eyes.png"}
                ]
            }), encoding="utf-8")
            Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(source / "body.png")
            Image.new("RGBA", (4, 4), (0, 255, 0, 255)).save(source / "clothes.png")
            eyes = Image.new("RGBA", (4, 4))
            eyes.putpixel((0, 0), (0, 0, 0, 255))
            eyes.save(source / "eyes.png")
            fallback = root / "fallback.png"
            clothes = Image.new("RGBA", (4, 4))
            clothes.putpixel((1, 1), (0, 0, 255, 255))
            clothes.save(fallback)
            original = {p.name: p.read_bytes() for p in source.iterdir()}
            output = root / "preview.png"
            shown = preview_mod(source, output, fallback_clothes=fallback)
            self.assertEqual(shown, ["body", "eyes", "fallback_clothes"])
            with Image.open(output) as rendered:
                self.assertEqual(rendered.getpixel((0, 0)), (0, 0, 0, 255))
                self.assertEqual(rendered.getpixel((1, 1)), (0, 0, 255, 255))
                self.assertEqual(rendered.getpixel((3, 3)), (255, 0, 0, 255))
            self.assertEqual(original, {p.name: p.read_bytes() for p in source.iterdir()})


if __name__ == "__main__":
    unittest.main()
