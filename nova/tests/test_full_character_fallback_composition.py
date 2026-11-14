"""Pixel-level regression for full-character base, replaceable slots and clothing safety."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.rig_layer_preview import render_frames


class FullCharacterCompositionTests(unittest.TestCase):
    def test_replaceable_layers_and_fallback_do_not_modify_mod(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            size = (16, 16)
            def save(name, color, box=None):
                im = Image.new("RGBA", size)
                if box is None:
                    im.paste(color, (0, 0, 16, 16))
                else:
                    im.paste(color, box)
                im.save(root / name)
            save("base.png", (220, 0, 0, 255))
            save("head.png", (0, 0, 220, 255), (0, 0, 8, 8))
            save("empty.png", (0, 0, 0, 0))
            save("shirt.png", (0, 220, 0, 255), (0, 8, 8, 16))
            save("eyes.png", (255, 255, 255, 255))
            manifest = {
                "canvas": [16, 16],
                "layers": {
                    "full_character": "base.png", "head": "head.png",
                    "clothes": "empty.png", "eyes": "eyes.png"
                },
                "hidden_slots": ["eyes"],
                "require_clothes": True,
                "fallback_clothes": "shirt.png"
            }
            (root / "manifest.json").write_text(json.dumps(manifest))
            joints = {"hip": [0.5, 0.5], "head": [0.5, 0.5]}
            (root / "rig.json").write_text(json.dumps({"joints": joints}))
            before = {p.name: p.read_bytes() for p in root.iterdir()}
            with patch("nova.tools.rig_layer_preview.sample_pose", return_value=joints):
                frames = render_frames(root, {"duration_ms": 100}, fps=10)
            self.assertEqual(len(frames), 1)
            frame = frames[0]
            self.assertEqual(frame.getpixel((2, 2)), (0, 0, 220, 255))
            self.assertEqual(frame.getpixel((2, 12)), (0, 220, 0, 255))
            self.assertEqual(frame.getpixel((12, 12)), (220, 0, 0, 255))
            self.assertEqual({p.name: p.read_bytes() for p in root.iterdir()}, before)


if __name__ == "__main__":
    unittest.main()
