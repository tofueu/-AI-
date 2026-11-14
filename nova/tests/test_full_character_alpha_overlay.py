"""Regression: transparent replacement pixels must reveal the full-character base."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.rig_layer_preview import render_frames


class AlphaOverlayTests(unittest.TestCase):
    def test_transparent_head_preserves_base_and_source_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            base = Image.new("RGBA", (8, 8), (200, 20, 30, 255))
            base.save(root / "base.png")
            head = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
            head.putpixel((2, 2), (20, 30, 200, 255))
            head.save(root / "head.png")
            (root / "manifest.json").write_text(json.dumps({
                "canvas": [8, 8],
                "layers": {"full_character": "base.png", "head": "head.png"}
            }), encoding="utf-8")
            joints = {"hip": [0.5, 0.5], "head": [0.5, 0.5]}
            (root / "rig.json").write_text(json.dumps({"joints": joints}), encoding="utf-8")
            before = {p.name: p.read_bytes() for p in root.iterdir()}
            with patch("nova.tools.rig_layer_preview.sample_pose", return_value=joints):
                frame, = render_frames(root, {"duration_ms": 100}, fps=10)
            self.assertEqual(frame.getpixel((2, 2)), (20, 30, 200, 255))
            self.assertEqual(frame.getpixel((3, 3)), (200, 20, 30, 255))
            self.assertEqual({p.name: p.read_bytes() for p in root.iterdir()}, before)


if __name__ == "__main__":
    unittest.main()
