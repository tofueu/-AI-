"""Render readiness regression checks for both NOVA character proportions."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.check_mod_render_ready import check_render_ready


class RenderReadyTests(unittest.TestCase):
    def test_blank_templates_not_ready(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as root:
                folder = create_template(Path(root) / "pack", variant)
                result = check_render_ready(folder)
                self.assertFalse(result["render_ready"])
                self.assertEqual(len(result["reasons"]), 2)

    def test_visible_body_and_clothes(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "chibi")
            for name in ("body", "clothes"):
                with Image.open(folder / (name + ".png")) as original:
                    Image.new("RGBA", original.size, (255, 0, 0, 255)).save(folder / (name + ".png"))
            self.assertTrue(check_render_ready(folder)["render_ready"])

    def test_visible_fallback_clothing(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "adult")
            with Image.open(folder / "body.png") as original:
                size = original.size
            Image.new("RGBA", size, (255, 0, 0, 255)).save(folder / "body.png")
            Image.new("RGBA", size, (0, 0, 255, 255)).save(folder / "safe.png")
            path = folder / "manifest.json"
            manifest = json.loads(path.read_text(encoding="utf-8"))
            manifest["fallback_clothes"] = "safe.png"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            self.assertTrue(check_render_ready(folder)["render_ready"])

    def test_rejects_unsafe_fallback_path(self):
        with tempfile.TemporaryDirectory() as root:
            folder = create_template(Path(root) / "pack", "chibi")
            path = folder / "manifest.json"
            manifest = json.loads(path.read_text(encoding="utf-8"))
            manifest["fallback_clothes"] = "../outside.png"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaises(ValueError):
                check_render_ready(folder)


if __name__ == "__main__":
    unittest.main()
