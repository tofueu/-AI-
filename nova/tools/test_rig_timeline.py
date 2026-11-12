"""Regression tests for NOVA normalized rig animation timeline."""
import unittest
from nova.tools.rig_timeline import sample_pose

RIG = {"joints": {"head": [0.5, 0.2], "hip": [0.5, 0.7]}}
TIMELINE = {"duration_ms": 1000, "loop": True, "frames": [
    {"time_ms": 0, "joints": {"head": [0.5, 0.2]}},
    {"time_ms": 500, "joints": {"head": [0.7, 0.4]}}]}

class TimelineTests(unittest.TestCase):
    def test_interpolation(self):
        self.assertAlmostEqual(sample_pose(RIG, TIMELINE, 250)["head"][0], 0.6)
    def test_loop(self):
        self.assertEqual(sample_pose(RIG, TIMELINE, 1250), sample_pose(RIG, TIMELINE, 250))
    def test_base_joint_retained(self):
        self.assertEqual(sample_pose(RIG, TIMELINE, 300)["hip"], [0.5, 0.7])
    def test_no_mutation(self):
        result = sample_pose(RIG, TIMELINE, 0)
        result["head"][0] = 0
        self.assertEqual(RIG["joints"]["head"][0], 0.5)
    def test_reject_unknown_joint(self):
        bad = {**TIMELINE, "frames": [{"time_ms": 0, "joints": {"unknown": [0, 0]}}]}
        with self.assertRaises(ValueError): sample_pose(RIG, bad, 0)
    def test_reject_unsorted(self):
        bad = {**TIMELINE, "frames": list(reversed(TIMELINE["frames"]))}
        with self.assertRaises(ValueError): sample_pose(RIG, bad, 0)
    def test_nonloop_clamp(self):
        self.assertEqual(sample_pose(RIG, {**TIMELINE, "loop": False}, 2000)["head"], [0.7, 0.4])
    def test_blend_return_to_first(self):
        self.assertAlmostEqual(sample_pose(RIG, TIMELINE, 750)["head"][0], 0.6)
        self.assertAlmostEqual(sample_pose(RIG, TIMELINE, 999)["head"][0], 0.5004)
    def test_exact_wrap(self):
        self.assertEqual(sample_pose(RIG, TIMELINE, 1000), sample_pose(RIG, TIMELINE, 0))
    def test_no_return_when_last_frame_at_duration(self):
        frames = [*TIMELINE["frames"], {"time_ms": 1000, "joints": {"head": [0.5, 0.2]}}]
        self.assertAlmostEqual(sample_pose(RIG, {**TIMELINE, "frames": frames}, 750)["head"][0], 0.6)
    def test_invalid_frame_type(self):
        with self.assertRaises(ValueError):
            sample_pose(RIG, {**TIMELINE, "frames": [None]}, 0)
    def test_invalid_rig_type(self):
        with self.assertRaises(ValueError):
            sample_pose(None, TIMELINE, 0)

if __name__ == "__main__":
    unittest.main()
