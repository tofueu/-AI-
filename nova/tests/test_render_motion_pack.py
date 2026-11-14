"""Regression tests for rendering the four NOVA motion previews."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.render_motion_pack import render_motion_pack
from nova.tools.export_motion_pack import MOTIONS


class RenderMotionPackTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.mod = self.root / "mod"
        self.mod.mkdir()
        (self.mod / "rig.json").write_text(json.dumps({"joints": {
            "head": [0.5, 0.2], "hip": [0.5, 0.5],
            "right_hand": [0.7, 0.4], "left_hand": [0.3, 0.4],
            "left_foot": [0.4, 0.8], "right_foot": [0.6, 0.8],
        }}), encoding="utf-8")

    def test_gif_pack_contains_four_timelines_and_exports(self):
        original = (self.mod / "rig.json").read_bytes()
        def fake_gif(mod, timeline, output, fps):
            Path(output).write_bytes(b"GIF89a")
        with patch("nova.tools.render_motion_pack.export_gif", side_effect=fake_gif) as exporter:
            result = render_motion_pack(self.mod, self.root / "out", fps=8)
        self.assertEqual(exporter.call_count, 4)
        self.assertEqual({p.name for p in result.iterdir()},
                         {m + ext for m in MOTIONS for ext in (".json", ".gif")})
        self.assertEqual((self.mod / "rig.json").read_bytes(), original)

    def test_png_pack_uses_four_independent_directories(self):
        def fake_png(mod, timeline, output, fps):
            Path(output).mkdir()
            (Path(output) / "frame_0000.png").write_bytes(b"png")
        with patch("nova.tools.render_motion_pack.export_png_frames", side_effect=fake_png) as exporter:
            result = render_motion_pack(self.mod, self.root / "out", format="png")
        self.assertEqual(exporter.call_count, 4)
        for motion in MOTIONS:
            self.assertTrue((result / motion / "frame_0000.png").is_file())

    def test_partial_failure_rolls_back(self):
        with patch("nova.tools.render_motion_pack.export_gif", side_effect=RuntimeError("encoder failed")):
            with self.assertRaisesRegex(RuntimeError, "encoder failed"):
                render_motion_pack(self.mod, self.root / "out")
        self.assertFalse((self.root / "out").exists())

    def test_existing_destination_is_untouched(self):
        dest = self.root / "out"
        dest.mkdir()
        (dest / "keep.txt").write_text("untouched")
        with self.assertRaises(FileExistsError):
            render_motion_pack(self.mod, dest)
        self.assertEqual((dest / "keep.txt").read_text(), "untouched")

    def test_invalid_options_create_no_output(self):
        for kwargs in ({"format": "mp4"}, {"fps": 0}, {"fps": 61}):
            with self.assertRaises(ValueError):
                render_motion_pack(self.mod, self.root / "out", **kwargs)
            self.assertFalse((self.root / "out").exists())


if __name__ == "__main__":
    unittest.main()
