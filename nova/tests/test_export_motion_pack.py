"""Regression tests for the atomic NOVA motion pack exporter."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.export_motion_pack import MOTIONS, export_motion_pack


class MotionPackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.mod = self.root / "mod"
        self.mod.mkdir()
        self.rig = self.mod / "rig.json"
        self.rig.write_text(json.dumps({"joints": {
            "head": [0.5, 0.2], "hip": [0.5, 0.5],
            "right_hand": [0.7, 0.4], "left_hand": [0.3, 0.4],
            "left_foot": [0.4, 0.8], "right_foot": [0.6, 0.8],
        }}), encoding="utf-8")

    def test_four_loops_preserve_rig(self):
        original = self.rig.read_bytes()
        dest = export_motion_pack(self.mod, self.root / "out")
        self.assertEqual({p.name for p in dest.iterdir()},
                         {m + ".json" for m in MOTIONS})
        for motion in MOTIONS:
            timeline = json.loads((dest / (motion + ".json")).read_text())
            self.assertTrue(timeline["loop"])
            self.assertEqual(timeline["frames"][0]["joints"],
                             timeline["frames"][-1]["joints"])
        self.assertEqual(self.rig.read_bytes(), original)

    def test_existing_output_never_overwritten(self):
        dest = self.root / "out"
        dest.mkdir()
        sentinel = dest / "keep.txt"
        sentinel.write_text("original")
        with self.assertRaises(FileExistsError):
            export_motion_pack(self.mod, dest)
        self.assertEqual(sentinel.read_text(), "original")

    def test_invalid_rig_rolls_back_new_directory(self):
        self.rig.write_text("{}")
        dest = self.root / "out"
        with self.assertRaises(ValueError):
            export_motion_pack(self.mod, dest)
        self.assertFalse(dest.exists())


if __name__ == "__main__":
    unittest.main()
