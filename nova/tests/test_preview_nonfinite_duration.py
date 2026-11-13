"""Regression tests for non-finite MOD preview durations (both character sizes)."""
import json
import math
import tempfile
import unittest
from pathlib import Path

from nova.tools.rig_layer_preview import render_frames


class PreviewDurationTests(unittest.TestCase):
    def test_rejects_nan_and_infinity_for_both_canvases(self):
        for canvas in ((256, 256), (512, 768)):
            with self.subTest(canvas=canvas), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                (root / "manifest.json").write_text(
                    json.dumps({"canvas": list(canvas), "layers": {}}), encoding="utf-8"
                )
                (root / "rig.json").write_text(
                    json.dumps({"joints": {"hip": [0.5, 0.5]}}), encoding="utf-8"
                )
                for duration in (math.nan, math.inf, -math.inf):
                    with self.subTest(duration=duration):
                        timeline = {"duration_ms": duration, "frames": [
                            {"time_ms": 0, "joints": {}}
                        ]}
                        with self.assertRaisesRegex(ValueError, "Invalid duration"):
                            render_frames(root, timeline)


if __name__ == "__main__":
    unittest.main()
