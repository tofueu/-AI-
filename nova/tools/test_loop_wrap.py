"""Regression coverage for seamless looping with delayed first keyframes."""
import unittest

from nova.tools.rig_timeline import sample_pose


class LoopWrapTests(unittest.TestCase):
    def test_delayed_first_frame_returns_to_rest_before_wrap(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant):
                rig = {"variant": variant, "joints": {"head": [0.5, 0.2], "hip": [0.5, 0.6]}}
                timeline = {"duration_ms": 1000, "loop": True, "frames": [
                    {"time_ms": 250, "joints": {"head": [0.7, 0.4]}},
                    {"time_ms": 750, "joints": {"head": [0.9, 0.6]}},
                ]}
                before_wrap = sample_pose(rig, timeline, 999.999)
                after_wrap = sample_pose(rig, timeline, 1000)
                self.assertAlmostEqual(before_wrap["head"][0], after_wrap["head"][0], places=4)
                self.assertAlmostEqual(before_wrap["head"][1], after_wrap["head"][1], places=4)
                self.assertEqual(after_wrap["head"], [0.5, 0.2])
                self.assertEqual(sample_pose(rig, timeline, 125)["head"], [0.6, 0.30000000000000004])
                self.assertEqual(rig["joints"]["head"], [0.5, 0.2])

    def test_zero_start_frame_still_wraps_to_first_keyframe(self):
        rig = {"joints": {"head": [0.5, 0.2]}}
        timeline = {"duration_ms": 1000, "loop": True, "frames": [
            {"time_ms": 0, "joints": {"head": [0.7, 0.4]}},
            {"time_ms": 500, "joints": {"head": [0.9, 0.6]}},
        ]}
        self.assertEqual(sample_pose(rig, timeline, 1000)["head"], [0.7, 0.4])
        self.assertAlmostEqual(sample_pose(rig, timeline, 999.999)["head"][0], 0.7, places=4)


if __name__ == "__main__":
    unittest.main()
