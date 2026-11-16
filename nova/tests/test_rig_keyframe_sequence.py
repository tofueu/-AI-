"""Tests for multi-keyframe rig pose sequences."""
import unittest
from nova.tools.rig_keyframe_sequence import sequence_frames


class KeyframeSequenceTests(unittest.TestCase):
    def setUp(self):
        self.a = {"head": (0.2, 0.3, 170)}
        self.b = {"head": (0.8, 0.3, -170)}

    def test_nonloop_endpoints(self):
        frames = sequence_frames([self.a, self.b], 4)
        self.assertEqual(len(frames), 5)
        self.assertEqual(frames[0], self.a)
        self.assertEqual(frames[-1], self.b)

    def test_loop_has_return_transition(self):
        frames = sequence_frames([self.a, self.b], 4, loop=True)
        self.assertEqual(len(frames), 8)
        self.assertEqual(frames[4], self.b)
        self.assertNotEqual(frames[-1], self.a)

    def test_shortest_rotation(self):
        frames = sequence_frames([self.a, self.b], 4, easing="linear")
        self.assertAlmostEqual(frames[2]["head"][2], 180)

    def test_rejects_invalid_inputs(self):
        for kwargs in ({"frames_per_segment": True}, {"frames_per_segment": 1},
                       {"loop": 1}, {"easing": "unknown"}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                sequence_frames([self.a, self.b], **kwargs)
        with self.assertRaises(ValueError):
            sequence_frames([self.a])
        with self.assertRaises(ValueError):
            sequence_frames([self.a, {"arm": (0.1, 0.1, 0)}])


if __name__ == "__main__":
    unittest.main()
