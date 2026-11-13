"""Regression: adult rig must have distinct left and right limb anchors."""
import json
import tempfile
import unittest
from pathlib import Path

from nova.tools.create_mod_template import create_template


class BilateralRigTests(unittest.TestCase):
    def test_left_right_joints_are_distinct_and_ordered(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                joints = rig["joints"]
                for part in ("shoulder", "hand", "foot"):
                    left = joints[f"left_{part}"]
                    right = joints[f"right_{part}"]
                    self.assertLess(left[0], right[0], f"{variant} {part} overlaps")
                    self.assertEqual(left[1], right[1])
                self.assertLess(joints["left_hand"][0], joints["left_shoulder"][0])
                self.assertGreater(joints["right_hand"][0], joints["right_shoulder"][0])


if __name__ == "__main__":
    unittest.main()
