"""Real renderer regression: hidden layers and clothing fallback remain effective."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.rig_layer_preview import render_frames


class LayerVisibilityAndClothingTests(unittest.TestCase):
    def test_hidden_eyes_and_transparent_clothes_use_fallback(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            size = (64, 64)
            joints = {
                "head": [0.5, 0.25], "hip": [0.5, 0.5],
                "left_hand": [0.3, 0.45], "right_hand": [0.7, 0.45],
                "left_foot": [0.4, 0.8], "right_foot": [0.6, 0.8],
            }
            (root / "rig.json").write_text(
                json.dumps({"joints": joints}), encoding="utf-8")
            manifest = {
                "canvas": list(size),
                "layers": {"clothes": "empty.png", "eyes": "eyes.png"},
                "hidden_slots": ["eyes"],
                "require_clothes": True,
                "fallback_clothes": "fallback.png",
            }
            (root / "manifest.json").write_text(
                json.dumps(manifest), encoding="utf-8")
            Image.new("RGBA", size).save(root / "empty.png")
            eyes = Image.new("RGBA", size)
            for x in range(26, 38):
                for y in range(12, 22):
                    eyes.putpixel((x, y), (255, 0, 0, 255))
            eyes.save(root / "eyes.png")
            fallback = Image.new("RGBA", size)
            for x in range(24, 40):
                for y in range(28, 44):
                    fallback.putpixel((x, y), (50, 80, 200, 255))
            fallback.save(root / "fallback.png")
            original = {p.name: p.read_bytes() for p in root.iterdir()}
            timeline = {
                "duration_ms": 1000, "loop": True,
                "frames": [
                    {"time_ms": 0, "joints": joints},
                    {"time_ms": 1000, "joints": joints},
                ],
            }
            frames = render_frames(root, timeline, fps=4)
            self.assertEqual(len(frames), 4)
            for frame in frames:
                self.assertEqual(frame.getpixel((32, 35)), (50, 80, 200, 255))
                self.assertEqual(frame.getpixel((32, 17))[3], 0)
            self.assertEqual(
                {p.name: p.read_bytes() for p in root.iterdir()}, original)


if __name__ == "__main__":
    unittest.main()
