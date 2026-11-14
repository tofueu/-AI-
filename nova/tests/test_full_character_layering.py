"""Full-character MOD artwork must not cover replacement slot artwork."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.rig_layer_preview import render_frames


class FullCharacterLayeringTests(unittest.TestCase):
    def test_replacement_head_draws_above_full_character(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGBA", (8, 8), (255, 0, 0, 255)).save(root / "character.png")
            Image.new("RGBA", (8, 8), (0, 0, 255, 255)).save(root / "head.png")
            (root / "manifest.json").write_text(json.dumps({
                "canvas": [8, 8],
                "layers": {"full_character": "character.png", "head": "head.png"}
            }), encoding="utf-8")
            rig = {"joints": {"hip": [0.5, 0.5], "head": [0.5, 0.5]}}
            (root / "rig.json").write_text(json.dumps(rig), encoding="utf-8")
            with patch("nova.tools.rig_layer_preview.sample_pose", return_value=rig["joints"]):
                frames = render_frames(root, {"duration_ms": 100}, fps=10)
            self.assertEqual(len(frames), 1)
            self.assertEqual(frames[0].getpixel((4, 4)), (0, 0, 255, 255))


if __name__ == "__main__":
    unittest.main()
