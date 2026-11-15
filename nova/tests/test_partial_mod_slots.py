"""Tests for partial MOD overrides retaining base rig metadata."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.outfit_motion_pipeline import render_outfit_frames
from nova.tools.mod_outfit import resolve_outfit


class PartialModTests(unittest.TestCase):
    def test_partial_slot_inherits_joint_anchor_and_order(self):
        base = [
            {"slot": "body", "file": "body.png", "joint": "root", "anchor": [2, 2], "order": 0},
            {"slot": "clothing", "file": "shirt.png", "joint": "root", "anchor": [2, 2], "order": 1},
        ]
        resolved = resolve_outfit(base, [{"slot": "clothing", "file": "mod.png"}])
        self.assertEqual(resolved[1], {"slot": "clothing", "file": "mod.png",
                                       "joint": "root", "anchor": [2, 2], "order": 1})
        self.assertEqual(base[1]["file"], "shirt.png")

    def test_partial_mod_renders_and_preserves_base(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, color in (("body.png", (255, 0, 0, 255)),
                                ("shirt.png", (0, 0, 255, 255)),
                                ("mod.png", (0, 255, 0, 255))):
                Image.new("RGBA", (4, 4), color).save(root / name)
            base = [
                {"slot": "body", "file": "body.png", "joint": "root", "anchor": [2, 2], "order": 0},
                {"slot": "clothing", "file": "shirt.png", "joint": "root", "anchor": [2, 2], "order": 1},
            ]
            rig = {"variant": "chibi", "coordinate_system": "normalized_xy",
                   "canvas": [32, 32], "joints": {"root": [0.5, 0.5]}}
            motion = {"variant": "chibi", "coordinate_system": "normalized_xy_offsets",
                      "clips": {"idle": [
                          {"frame": 0, "offsets": {"root": [0, 0]}},
                          {"frame": 2, "offsets": {"root": [0.1, 0]}},
                          {"frame": 4, "offsets": {"root": [0, 0]}}]}}
            target = root.parent / (root.name + "-output")
            try:
                render_outfit_frames(rig, motion, base,
                                     [{"slot": "clothing", "file": "mod.png"}],
                                     root, "idle", target, frame_count=4)
                with Image.open(target / "frame_0000.png") as image:
                    self.assertEqual(image.convert("RGBA").getpixel((16, 16)),
                                     (0, 255, 0, 255))
                self.assertTrue((target / "preview.gif").is_file())
                self.assertTrue((root / "shirt.png").is_file())
            finally:
                import shutil
                shutil.rmtree(target, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
