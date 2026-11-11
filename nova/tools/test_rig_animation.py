"""Regression tests for NOVA joint pose interpolation."""
import unittest
try:
    from .rig_animation import interpolate_pose, sample_loop
except ImportError:
    from rig_animation import interpolate_pose, sample_loop

class RigAnimationTests(unittest.TestCase):
    def test_interpolation_and_seamless_loop(self):
        frames = [
            {"time": 0, "pose": {"head": [0,0,0]}},
            {"time": .5, "pose": {"head": [0,2,20]}},
            {"time": 1, "pose": {"head": [0,0,0]}}
        ]
        self.assertEqual(interpolate_pose(frames, .25)["head"], (0,1,10))
        loop = sample_loop(frames, 8)
        self.assertEqual(len(loop), 8)
        self.assertEqual(loop[0]["head"], (0,0,0))
        self.assertEqual(loop[4]["head"], (0,2,20))
    def test_reject_invalid_inputs(self):
        with self.assertRaises(ValueError):
            interpolate_pose([{"time":0,"pose":{}},{"time":0,"pose":{}}], .5)
        with self.assertRaises(ValueError):
            sample_loop([], 0)
        with self.assertRaises(ValueError):
            interpolate_pose([{"time":0,"pose":{}},{"time":1,"pose":{}}], float("nan"))

if __name__ == "__main__":
    unittest.main()
