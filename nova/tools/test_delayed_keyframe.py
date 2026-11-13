"""Regression coverage for delayed NOVA keyframes in both character rigs."""
import unittest

from nova.tools.rig_timeline import sample_pose


class DelayedKeyframeTests(unittest.TestCase):
    def test_rest_to_first_keyframe_interpolates_without_jump(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant):
                rig = {"variant": variant, "joints": {"head": [0.5, 0.2], "hip": [0.5, 0.6]}}
                timeline = {"duration_ms": 1000, "loop": False, "frames": [
                    {"time_ms": 500, "joints": {"head": [0.7, 0.4]}}
                ]}
                self.assertEqual(sample_pose(rig, timeline, 0)["head"], [0.5, 0.2])
                middle = sample_pose(rig, timeline, 250)
                self.assertAlmostEqual(middle["head"][0], 0.6)
                self.assertAlmostEqual(middle["head"][1], 0.3)
                self.assertEqual(middle["hip"], [0.5, 0.6])
                self.assertEqual(sample_pose(rig, timeline, 500)["head"], [0.7, 0.4])
                self.assertEqual(rig["joints"]["head"], [0.5, 0.2])

    def test_zero_start_keyframe_remains_exact(self):
        rig = {"joints": {"head": [0.5, 0.2]}}
        timeline = {"duration_ms": 1000, "loop": False, "frames": [
            {"time_ms": 0, "joints": {"head": [0.6, 0.3]}}
        ]}
        self.assertEqual(sample_pose(rig, timeline, 0)["head"], [0.6, 0.3])


if __name__ == "__main__":
    unittest.main()
