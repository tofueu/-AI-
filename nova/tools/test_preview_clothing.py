"""Clothing safety regression for both NOVA rig variants."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames

class PreviewClothingTests(unittest.TestCase):
    def test_required_clothes_fallback_and_source_protection(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                rig = json.loads((root / "rig.json").read_text())
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text())
                timeline = {"duration_ms": 100, "loop": False,
                            "frames": [{"time_ms": 0, "joints": {}}]}
                with self.assertRaisesRegex(ValueError, "Required clothes"):
                    render_frames(root, timeline, fps=10)
                size = tuple(manifest["canvas"])
                fallback = Image.new("RGBA", size, (0, 0, 0, 0))
                fallback.putpixel((10, 10), (255, 0, 0, 255))
                fallback.save(root / "fallback.png")
                before = (root / "fallback.png").read_bytes()
                manifest["fallback_clothes"] = "fallback.png"
                manifest_path.write_text(json.dumps(manifest))
                frames = render_frames(root, timeline, fps=10)
                self.assertEqual(frames[0].getpixel((10, 10)), (255, 0, 0, 255))
                self.assertEqual((root / "fallback.png").read_bytes(), before)
                manifest["fallback_clothes"] = "../escape.png"
                manifest_path.write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):
                    render_frames(root, timeline, fps=10)

if __name__ == "__main__":
    unittest.main()
