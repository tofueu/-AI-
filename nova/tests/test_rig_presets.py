"""Contract tests for separate NOVA rig starter presets."""
import unittest

from nova.tools.mod_slot_resolver import SLOTS
from nova.tools.rig_keyframe_sequence import sequence_frames
from nova.tools.rig_presets import rig_preset
from nova.tools.rig_tween import _validate_pose


class RigPresetTests(unittest.TestCase):
    def test_each_variant_has_distinct_canvas_and_all_slots(self):
        chibi = rig_preset("chibi")
        adult = rig_preset("adult")
        self.assertEqual(chibi[0], (512, 512))
        self.assertEqual(adult[0], (768, 1024))
        for _, attachments, poses in (chibi, adult):
            self.assertEqual(set(attachments), set(SLOTS))
            for pose in poses:
                self.assertEqual(set(attachments.values()), set(_validate_pose(pose)))

    def test_both_motions_interpolate_and_close_loop(self):
        for variant in ("chibi", "adult"):
            for motion in ("idle", "wave"):
                _, _, poses = rig_preset(variant, motion)
                frames = sequence_frames(poses, frames_per_segment=3, loop=True)
                self.assertEqual(len(frames), 9)
                self.assertEqual(poses[0], poses[-1])
                self.assertNotEqual(poses[0], poses[1])

    def test_calls_do_not_share_mutable_pose_state(self):
        _, _, poses = rig_preset("chibi")
        poses[0]["head"] = (0, 0, 0)
        _, _, fresh = rig_preset("chibi")
        self.assertNotEqual(poses[0]["head"], fresh[0]["head"])

    def test_invalid_variant_or_motion_rejected(self):
        for variant, motion in (("other", "idle"), ("adult", "jump")):
            with self.assertRaises(ValueError):
                rig_preset(variant, motion)


if __name__ == "__main__":
    unittest.main()
