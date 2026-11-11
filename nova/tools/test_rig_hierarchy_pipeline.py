"""End-to-end tests for parent-child rig rendering and GIF export."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .rig_pipeline import export_rig_animation
    from .rig_render import render_loop
except ImportError:
    from rig_pipeline import export_rig_animation
    from rig_render import render_loop


class HierarchyPipelineTests(unittest.TestCase):
    def setUp(self):
        self.layer = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        self.layer.putpixel((10, 10), (255, 0, 0, 255))
        self.parts = [{"image": self.layer, "joint": "child",
                       "pivot": (10, 10)}]
        self.joints = {"root": {"parent": None, "pivot": [10, 10]},
                       "child": {"parent": "root", "pivot": [10, 10]}}
        self.frames = [
            {"time": 0, "pose": {"root": [0, 0, 0]}},
            {"time": 0.5, "pose": {"root": [4, 0, 0]}},
            {"time": 1, "pose": {"root": [0, 0, 0]}}
        ]

    def test_parent_moves_child_without_mutating_source(self):
        frames = render_loop(self.parts, self.frames, (32, 32), 4,
                             joints=self.joints)
        self.assertEqual(len(frames), 4)
        self.assertEqual(frames[0].getpixel((10, 10)), (255, 0, 0, 255))
        self.assertEqual(frames[2].getpixel((14, 10)), (255, 0, 0, 255))
        self.assertEqual(frames[2].getpixel((10, 10))[3], 0)
        self.assertEqual(self.layer.getpixel((10, 10)), (255, 0, 0, 255))

    def test_pipeline_writes_animation_with_hierarchy(self):
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / "hierarchy.gif"
            output = export_rig_animation(
                self.parts, self.frames, (32, 32), 4, destination,
                joints=self.joints)
            self.assertEqual(output, destination)
            with Image.open(output) as gif:
                self.assertGreaterEqual(gif.n_frames, 2)
                self.assertEqual(gif.info["loop"], 0)
            with self.assertRaises(FileExistsError):
                export_rig_animation(self.parts, self.frames, (32, 32),
                                     4, destination, joints=self.joints)

    def test_invalid_parent_rejected_before_file_creation(self):
        invalid = {"child": {"parent": "missing", "pivot": [10, 10]}}
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / "invalid.gif"
            with self.assertRaises(ValueError):
                export_rig_animation(self.parts, self.frames, (32, 32),
                                     4, destination, joints=invalid)
            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
