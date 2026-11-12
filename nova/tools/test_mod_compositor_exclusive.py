"""Regression tests for exclusive NOVA PNG export writes."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .mod_compositor import render
except ImportError:
    from mod_compositor import render


class ExclusiveExportTests(unittest.TestCase):
    def test_existing_output_is_never_replaced(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new("RGBA", (8, 8), (200, 100, 80, 255)).save(root / "body.png")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "canvas": [8, 8], "layers": {"body": "body.png"}
            }), encoding="utf-8")
            output = root / "preview.png"
            self.assertEqual(render(manifest, output), output)
            first = output.read_bytes()
            with self.assertRaises(FileExistsError):
                render(manifest, output)
            self.assertEqual(output.read_bytes(), first)

    def test_new_output_is_valid_png(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new("RGBA", (8, 8), (200, 100, 80, 255)).save(root / "body.png")
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps({
                "canvas": [8, 8], "layers": {"body": "body.png"}
            }), encoding="utf-8")
            output = root / "preview.png"
            render(manifest, output)
            with Image.open(output) as result:
                self.assertEqual(result.size, (8, 8))
                self.assertEqual(result.getpixel((0, 0)), (200, 100, 80, 255))


if __name__ == "__main__":
    unittest.main()
