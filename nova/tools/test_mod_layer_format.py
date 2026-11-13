"""Regression tests: a MOD must not disguise arbitrary image formats as PNG layers."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames


TIMELINE = {"duration_ms": 100, "loop": False, "frames": [{"time_ms": 0, "joints": {}}]}


class LayerFormatTests(unittest.TestCase):
    def test_disguised_jpeg_is_rejected_for_both_variants(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                size = Image.open(root / "head.png").size
                Image.new("RGB", size, (80, 90, 100)).save(root / "head.png", format="JPEG")
                with self.assertRaisesRegex(ValueError, "PNG"):
                    render_frames(root, TIMELINE, fps=10)


if __name__ == "__main__":
    unittest.main()
