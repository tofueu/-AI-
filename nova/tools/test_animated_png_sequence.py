"""Regression checks that PNG sequences carry real joint motion for both rigs."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import export_png_frames


class AnimatedPngSequenceTests(unittest.TestCase):
    def test_head_motion_preserves_sources_for_both_variants(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                width, height = manifest["canvas"]
                head = Image.new("RGBA", (width, height))
                head.putpixel((width // 2, height // 3), (255, 0, 0, 255))
                head.save(root / "head.png")
                original = (root / "head.png").read_bytes()
                x, y = rig["joints"]["head"]
                timeline = {
                    "duration_ms": 1000,
                    "loop": False,
                    "frames": [
                        {"time_ms": 0, "joints": {"head": [x, y]}},
                        {"time_ms": 500, "joints": {"head": [x, y + 0.1]}},
                    ],
                }
                output = export_png_frames(root, timeline, Path(tmp) / "frames", fps=4)
                paths = sorted(output.glob("frame_*.png"))
                self.assertEqual(len(paths), 4)
                with Image.open(paths[0]) as first, Image.open(paths[2]) as moved:
                    self.assertEqual(first.mode, "RGBA")
                    self.assertEqual(moved.mode, "RGBA")
                    self.assertNotEqual(first.tobytes(), moved.tobytes())
                    self.assertEqual(first.getpixel((width // 2, height // 3))[3], 255)
                    self.assertEqual(moved.getpixel((width // 2, height // 3))[3], 0)
                self.assertEqual((root / "head.png").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
