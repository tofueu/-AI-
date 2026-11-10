"""Regression tests for joint keyframe interpolation."""
import unittest

try:
    from .pose_interpolation import interpolate_keyframes
except ImportError:
    from pose_interpolation import interpolate_keyframes


class InterpolationTests(unittest.TestCase):
    def test_loop_continuity_and_durations(self):
        keys = [
            {"angles": {"head": 0}, "duration_ms": 120},
            {"angles": {"head": 30}, "duration_ms": 120},
        ]
        frames = interpolate_keyframes(keys, steps=4)
        self.assertEqual(len(frames), 8)
        self.assertEqual(sum(f["duration_ms"] for f in frames), 240)
        self.assertEqual([f["angles"]["head"] for f in frames[:5]], [0, 4.6875, 15, 25.3125, 30])
        self.assertGreater(frames[-1]["angles"]["head"], 0)

    def test_sparse_joints_default_to_zero(self):
        frames = interpolate_keyframes([
            {"angles": {"left_arm": 20}, "duration_ms": 100},
            {"angles": {"right_arm": -20}, "duration_ms": 100},
        ], steps=2, loop=False)
        self.assertEqual(frames[1]["angles"], {"left_arm": 10, "right_arm": -10})
        self.assertEqual(frames[-1]["angles"], {"right_arm": -20})

    def test_invalid_inputs(self):
        with self.assertRaises(ValueError):
            interpolate_keyframes([{"angles": {}}])
        with self.assertRaises(ValueError):
            interpolate_keyframes([{"angles": {}, "duration_ms": 20}, {"angles": {}}], steps=4)
        with self.assertRaises(ValueError):
            interpolate_keyframes([{"angles": {"head": float("nan")}}, {"angles": {}}])
        with self.assertRaises(ValueError):
            interpolate_keyframes([{"angles": {}}, {"angles": {}}], steps=True)


if __name__ == "__main__":
    unittest.main()
