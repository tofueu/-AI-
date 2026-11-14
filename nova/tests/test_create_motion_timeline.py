"""Tests for authored idle/wave/walk/jump timelines and source immutability."""
import json
import tempfile
import unittest
from pathlib import Path

from nova.tools.create_mod_template import create_template
from nova.tools.create_motion_timeline import create_motion_timeline
from nova.tools.rig_timeline import sample_pose


class MotionTimelineTests(unittest.TestCase):
    def test_both_variants_both_motions(self):
        for variant in ("chibi", "adult"):
            for motion in ("idle", "wave", "walk", "jump"):
                with self.subTest(variant=variant, motion=motion), tempfile.TemporaryDirectory() as temp:
                    root = Path(temp)
                    mod = create_template(root / "mod", variant)
                    rig_file = mod / "rig.json"
                    before = rig_file.read_bytes()
                    dest = root / "motion.json"
                    create_motion_timeline(mod, dest, motion)
                    self.assertEqual(before, rig_file.read_bytes())
                    timeline = json.loads(dest.read_text(encoding="utf-8"))
                    rig = json.loads(before)
                    self.assertEqual(timeline["duration_ms"], 2000)
                    self.assertEqual(len(timeline["frames"]), 9)
                    first = sample_pose(rig, timeline, 0)
                    last = sample_pose(rig, timeline, 2000)
                    self.assertEqual(first, last)
                    mid = sample_pose(rig, timeline, 1000)
                    self.assertNotEqual(mid["head"], first["head"])
                    if motion == "wave":
                        self.assertNotEqual(mid["right_hand"], first["right_hand"])
                    if motion == "walk":
                        quarter = sample_pose(rig, timeline, 500)
                        self.assertNotEqual(quarter["left_foot"], first["left_foot"])
                        self.assertNotEqual(quarter["right_foot"], first["right_foot"])
                        self.assertNotEqual(quarter["left_hand"], first["left_hand"])
                        self.assertNotEqual(quarter["right_hand"], first["right_hand"])
                    if motion == "jump":
                        self.assertNotEqual(mid["hip"], first["hip"])
                        self.assertNotEqual(mid["left_foot"], first["left_foot"])
                        self.assertNotEqual(mid["right_foot"], first["right_foot"])
                    with self.assertRaises(FileExistsError):
                        create_motion_timeline(mod, dest, motion)

    def test_malformed_rig_does_not_create_output(self):
        for bad_rig in ({}, {"joints": []}, {"joints": {"head": [0.5, 0.5]}}):
            with self.subTest(bad_rig=bad_rig), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                mod = create_template(root / "mod", "chibi")
                (mod / "rig.json").write_text(json.dumps(bad_rig), encoding="utf-8")
                output = root / "motion.json"
                with self.assertRaises(ValueError):
                    create_motion_timeline(mod, output, "walk")
                self.assertFalse(output.exists())

    def test_edge_joint_motion_is_rejected_before_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mod = create_template(root / "mod", "adult")
            rig_path = mod / "rig.json"
            rig = json.loads(rig_path.read_text(encoding="utf-8"))
            rig["joints"]["head"] = [0.5, 0.0]
            rig_path.write_text(json.dumps(rig), encoding="utf-8")
            output = root / "motion.json"
            with self.assertRaisesRegex(ValueError, "outside canvas"):
                create_motion_timeline(mod, output, "idle")
            self.assertFalse(output.exists())

    def test_invalid_motion_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mod = create_template(root / "mod", "chibi")
            output = root / "invalid.json"
            with self.assertRaises(ValueError):
                create_motion_timeline(mod, output, "teleport")
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
