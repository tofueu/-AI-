"""Integration tests for the MOD-to-animation pipeline."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.outfit_motion_pipeline import render_outfit_frames


class OutfitMotionPipelineTests(unittest.TestCase):
    def test_transparent_clothing_falls_back_and_renders(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            assets = root / "assets"
            assets.mkdir()
            for name, color in (("body.png", (255, 0, 0, 255)),
                                ("clothing.png", (0, 0, 255, 255)),
                                ("empty.png", (0, 0, 0, 0))):
                Image.new("RGBA", (4, 4), color).save(assets / name)
            rig = {"variant": "chibi", "coordinate_system": "normalized_xy",
                   "canvas": [32, 32], "joints": {"root": [0.5, 0.5]}}
            motion = {"variant": "chibi", "coordinate_system": "normalized_xy_offsets",
                      "clips": {"idle": [
                          {"frame": 0, "offsets": {"root": [0, 0]}},
                          {"frame": 2, "offsets": {"root": [0.1, 0]}},
                          {"frame": 4, "offsets": {"root": [0, 0]}}]}}
            base = [{"slot": "body", "file": "body.png", "joint": "root",
                     "anchor": [2, 2], "order": 0},
                    {"slot": "clothing", "file": "clothing.png", "joint": "root",
                     "anchor": [2, 2], "order": 1}]
            mod = [{"slot": "clothing", "file": "empty.png", "joint": "root",
                    "anchor": [2, 2], "order": 1}]
            output = root / "output"
            render_outfit_frames(rig, motion, base, mod, assets, "idle", output,
                                 frame_count=4)
            self.assertEqual(len(list(output.glob("frame_*.png"))), 4)
            self.assertTrue((output / "preview.gif").is_file())
            with Image.open(output / "frame_0000.png") as frame:
                self.assertEqual(frame.convert("RGBA").getpixel((16, 16)),
                                 (0, 0, 255, 255))
            self.assertEqual(mod[0]["file"], "empty.png")
            self.assertTrue((assets / "empty.png").is_file())

    def test_invalid_base_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            Image.new("RGBA", (2, 2), (0, 0, 0, 0)).save(root / "empty.png")
            with self.assertRaises(ValueError):
                render_outfit_frames({}, {}, [
                    {"slot": "body", "file": "empty.png"},
                    {"slot": "clothing", "file": "empty.png"}],
                    [], root, "idle", root / "out")
            self.assertFalse((root / "out").exists())


if __name__ == "__main__":
    unittest.main()
