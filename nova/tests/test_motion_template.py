"""Validate editable NOVA keyframe clips in both blank MOD templates."""
import json
import tempfile
import unittest
from pathlib import Path
from nova.tools.create_mod_template import SIZES, create_template


class MotionTemplateTests(unittest.TestCase):
    def test_both_variants_include_loopable_joint_clips(self):
        for variant in SIZES:
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                folder = create_template(Path(tmp) / variant, variant)
                rig = json.loads((folder / "rig.json").read_text(encoding="utf-8"))
                motion = json.loads((folder / "animations.json").read_text(encoding="utf-8"))
                self.assertEqual(motion["variant"], variant)
                self.assertEqual(motion["coordinate_system"], "normalized_xy_offsets")
                self.assertGreater(motion["fps"], 0)
                self.assertEqual(set(motion["clips"]), {"idle", "typing"})
                for name, frames in motion["clips"].items():
                    self.assertGreaterEqual(len(frames), 3, name)
                    self.assertEqual(frames[0]["frame"], 0)
                    self.assertEqual(frames[0]["offsets"], frames[-1]["offsets"])
                    indices = [frame["frame"] for frame in frames]
                    self.assertEqual(indices, sorted(set(indices)))
                    for frame in frames:
                        self.assertTrue(set(frame["offsets"]).issubset(rig["joints"]))
                        for xy in frame["offsets"].values():
                            self.assertEqual(len(xy), 2)
                            self.assertTrue(all(isinstance(v, (int, float)) for v in xy))


if __name__ == "__main__":
    unittest.main()
