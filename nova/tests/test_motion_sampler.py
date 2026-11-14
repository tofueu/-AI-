"""Tests for NOVA keyframe interpolation and source preservation."""
import unittest
from copy import deepcopy
from nova.tools.motion_sampler import sample_pose

RIG = {'variant': 'chibi', 'coordinate_system': 'normalized_xy', 'joints': {'head': [0.5, 0.2], 'hand': [0.2, 0.5]}}
MOTION = {'variant': 'chibi', 'coordinate_system': 'normalized_xy_offsets', 'clips': {'idle': [
    {'frame': 0, 'offsets': {'head': [0, 0]}},
    {'frame': 4, 'offsets': {'head': [0, -0.04], 'hand': [0, 0.02]}},
    {'frame': 8, 'offsets': {'head': [0, 0]}},
]}}


class SamplerTests(unittest.TestCase):
    def test_midpoint_and_missing_joint_offsets(self):
        pose = sample_pose(RIG, MOTION, 'idle', 2)
        self.assertAlmostEqual(pose['head'][1], 0.18)
        self.assertAlmostEqual(pose['hand'][1], 0.51)

    def test_loop(self):
        self.assertEqual(sample_pose(RIG, MOTION, 'idle', 1), sample_pose(RIG, MOTION, 'idle', 9))

    def test_negative_frame(self):
        self.assertEqual(sample_pose(RIG, MOTION, 'idle', -1), sample_pose(RIG, MOTION, 'idle', 7))

    def test_source_not_modified(self):
        before = deepcopy((RIG, MOTION))
        sample_pose(RIG, MOTION, 'idle', 3)
        self.assertEqual((RIG, MOTION), before)

    def test_variant_mismatch(self):
        m = deepcopy(MOTION); m['variant'] = 'adult'
        with self.assertRaises(ValueError): sample_pose(RIG, m, 'idle', 1)

    def test_unknown_joint(self):
        m = deepcopy(MOTION); m['clips']['idle'][1]['offsets']['unknown'] = [0, 0]
        with self.assertRaises(ValueError): sample_pose(RIG, m, 'idle', 2)

    def test_non_looping_clip_rejected(self):
        m = deepcopy(MOTION); m['clips']['idle'][-1]['offsets']['head'] = [0, 1]
        with self.assertRaises(ValueError): sample_pose(RIG, m, 'idle', 2)


if __name__ == '__main__':
    unittest.main()
