"""Verify slot visibility overrides for Q and adult NOVA MODs."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.rig_layer_preview import render_frames


class HiddenSlotsTests(unittest.TestCase):
    def test_hide_slots_preserves_source_and_visible_layer(self):
        for size in ((256, 256), (512, 768)):
            with self.subTest(size=size), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "rig.json").write_text(json.dumps({
                    "joints": {"hip": [0.5, 0.5], "head": [0.5, 0.25]}
                }), encoding="utf-8")
                (root / "manifest.json").write_text(json.dumps({
                    "canvas": list(size),
                    "layers": {"body": "body.png", "eyes": "eyes.png"},
                    "hidden_slots": ["eyes"]
                }), encoding="utf-8")
                Image.new("RGBA", size, (20, 40, 60, 255)).save(root / "body.png")
                Image.new("RGBA", size, (250, 0, 0, 255)).save(root / "eyes.png")
                before = (root / "eyes.png").read_bytes()
                frames = render_frames(root, {
                    "duration_ms": 100, "frames": [{"time_ms": 0, "joints": {}}]
                }, fps=10)
                self.assertEqual(frames[0].getpixel((size[0] // 2, size[1] // 2)),
                                 (20, 40, 60, 255))
                self.assertEqual((root / "eyes.png").read_bytes(), before)

    def test_reject_invalid_hidden_slots(self):
        for invalid in ("eyes", ["unknown"], ["eyes", "eyes"], [None]):
            with self.subTest(invalid=invalid), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "rig.json").write_text('{"joints": {}}', encoding="utf-8")
                (root / "manifest.json").write_text(json.dumps({
                    "canvas": [256, 256], "layers": {}, "hidden_slots": invalid
                }), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "Invalid hidden_slots"):
                    render_frames(root, {"duration_ms": 100, "frames": []})


if __name__ == "__main__":
    unittest.main()
