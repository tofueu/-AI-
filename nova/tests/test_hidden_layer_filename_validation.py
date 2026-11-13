"""Hidden slots must not bypass MOD filename validation."""
import json
import tempfile
import unittest
from pathlib import Path

from nova.tools.rig_layer_preview import render_frames


class HiddenLayerFilenameValidationTests(unittest.TestCase):
    def test_hidden_slot_rejects_invalid_filename(self):
        for filename in ("../outside.png", "/tmp/outside.png", "eyes.jpg", 123, ""):
            with self.subTest(filename=filename), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "rig.json").write_text(
                    json.dumps({"joints": {}}), encoding="utf-8"
                )
                (root / "manifest.json").write_text(
                    json.dumps({
                        "canvas": [256, 256],
                        "layers": {"eyes": filename},
                        "hidden_slots": ["eyes"],
                    }), encoding="utf-8"
                )
                with self.assertRaisesRegex(ValueError, "Invalid layer filename"):
                    render_frames(root, {"duration_ms": 100, "frames": []})

    def test_hidden_slot_does_not_require_image_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "rig.json").write_text(
                json.dumps({"joints": {}}), encoding="utf-8"
            )
            (root / "manifest.json").write_text(
                json.dumps({
                    "canvas": [256, 256],
                    "layers": {"eyes": "not_installed.png"},
                    "hidden_slots": ["eyes"],
                }), encoding="utf-8"
            )
            frames = render_frames(root, {"duration_ms": 100, "frames": []}, fps=10)
            self.assertEqual(len(frames), 1)
            self.assertEqual(frames[0].getbbox(), None)


if __name__ == "__main__":
    unittest.main()
