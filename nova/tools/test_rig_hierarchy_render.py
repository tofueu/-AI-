"""Integration tests for hierarchical joint rendering."""
import unittest
from PIL import Image
try:
    from .rig_render import render_loop
except ImportError:
    from rig_render import render_loop


class HierarchicalRenderTests(unittest.TestCase):
    def test_child_follows_parent_translation_without_mutating_source(self):
        layer = Image.new("RGBA", (32, 32))
        layer.putpixel((10, 10), (255, 0, 0, 255))
        parts = [{"image": layer, "joint": "hand", "pivot": (10, 10)}]
        joints = {"body": {"parent": None, "pivot": [0, 0]},
                  "hand": {"parent": "body", "pivot": [10, 10]}}
        keyframes = [{"time": 0, "pose": {"body": [0, 0, 0]}},
                     {"time": 1, "pose": {"body": [4, 0, 0]}}]
        frames = render_loop(parts, keyframes, (32, 32), 2, joints=joints)
        self.assertEqual(len(frames), 2)
        self.assertEqual(frames[0].getpixel((10, 10)), (255, 0, 0, 255))
        self.assertEqual(frames[1].getpixel((12, 10)), (255, 0, 0, 255))
        self.assertEqual(layer.getpixel((10, 10)), (255, 0, 0, 255))

    def test_unknown_joint_rejected(self):
        layer = Image.new("RGBA", (16, 16), (255, 0, 0, 255))
        parts = [{"image": layer, "joint": "hand", "pivot": (0, 0)}]
        keyframes = [{"time": 0, "pose": {"missing": [1, 0, 0]}},
                     {"time": 1, "pose": {"missing": [2, 0, 0]}}]
        with self.assertRaises(ValueError):
            render_loop(parts, keyframes, (16, 16), 2,
                        joints={"hand": {"parent": None, "pivot": [0, 0]}})


if __name__ == "__main__":
    unittest.main()
