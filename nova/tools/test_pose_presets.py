import unittest
from pose_presets import PRESETS, generate


class PresetTests(unittest.TestCase):
    def test_all_presets_match_rig_and_loop(self):
        joints = {'root', 'torso', 'neck', 'head', 'left_arm', 'right_arm', 'left_leg', 'right_leg'}
        for preset in PRESETS:
            with self.subTest(preset=preset):
                poses = generate(preset, 16, 90)
                self.assertEqual(len(poses), 16)
                self.assertTrue(all(set(p['angles']) <= joints for p in poses))
                self.assertTrue(all(p['duration_ms'] == 90 for p in poses))
                self.assertNotEqual(poses[0], poses[4])

    def test_invalid_arguments(self):
        for args in [('unknown', 16, 100), ('walk', 0, 100), ('idle', 121, 100),
                     ('typing', 16, 0), ('idle', True, 100)]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                generate(*args)


if __name__ == '__main__':
    unittest.main()
