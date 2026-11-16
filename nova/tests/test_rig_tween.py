"""Tests for NOVA rig interpolation, independent of image assets."""
import unittest
from nova.tools.rig_tween import interpolate_pose, tween_frames


class RigTweenTests(unittest.TestCase):
    def setUp(self):
        self.a = {"head": (0.5, 0.2, 170), "arm": (0.2, 0.5, 0)}
        self.b = {"head": (0.7, 0.4, -170), "arm": (0.6, 0.5, 90)}

    def test_endpoints_and_frame_count(self):
        frames = tween_frames(self.a, self.b, 5)
        self.assertEqual(len(frames), 5)
        self.assertEqual(frames[0], self.a)
        self.assertEqual(frames[-1], self.b)

    def test_shortest_angle_and_coordinates(self):
        midpoint = interpolate_pose(self.a, self.b, 0.5)
        self.assertAlmostEqual(midpoint["head"][0], 0.6)
        self.assertAlmostEqual(midpoint["head"][2], 180)
        self.assertAlmostEqual(midpoint["arm"][2], 45)

    def test_rejects_malformed_inputs(self):
        for invalid in (-0.1, 1.1, True, float("nan")):
            with self.subTest(fraction=invalid), self.assertRaises(ValueError):
                interpolate_pose(self.a, self.b, invalid)
        with self.assertRaises(ValueError):
            interpolate_pose(self.a, {"head": (0.2, 0.2, 0)}, 0.5)
        with self.assertRaises(ValueError):
            interpolate_pose({"head": (float("inf"), 0.2, 0)}, self.b, 0.5)
        with self.assertRaises(ValueError):
            tween_frames(self.a, self.b, 1)


if __name__ == "__main__":
    unittest.main()
