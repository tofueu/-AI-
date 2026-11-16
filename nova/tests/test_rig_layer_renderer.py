"""Tests for pixel-level joint-driven MOD animation."""
import unittest
from PIL import Image
from nova.tools.rig_layer_renderer import render_pose, render_sequence


class RigLayerRendererTests(unittest.TestCase):
    def setUp(self):
        self.size = (64, 64)
        self.layer = Image.new("RGBA", self.size)
        self.layer.putpixel((16, 16), (255, 0, 0, 255))
        self.layers = {"hair": self.layer}
        self.attachments = {"hair": "head"}
        self.start = {"head": (0.25, 0.25, 0)}
        self.end = {"head": (0.75, 0.25, 0)}

    def test_translation_and_source_unchanged(self):
        frame = render_pose(self.layers, self.attachments, self.start, self.end, self.size)
        self.assertEqual(frame.getpixel((48, 16)), (255, 0, 0, 255))
        self.assertEqual(frame.getpixel((16, 16))[3], 0)
        self.assertEqual(self.layer.getpixel((16, 16)), (255, 0, 0, 255))

    def test_hidden_layer(self):
        frame = render_pose(self.layers, self.attachments, self.start, self.end,
                            self.size, {"hair": False})
        self.assertIsNone(frame.getchannel("A").getbbox())

    def test_sequence_contains_intermediate_pixels(self):
        frames = render_sequence(self.layers, self.attachments,
                                 [self.start, self.end], self.size, frames_per_segment=4)
        self.assertEqual(len(frames), 5)
        self.assertEqual(frames[2].getpixel((32, 16)), (255, 0, 0, 255))
        self.assertEqual(frames[-1].getpixel((48, 16)), (255, 0, 0, 255))

    def test_rejects_invalid_attachments(self):
        with self.assertRaises(ValueError):
            render_pose(self.layers, {"hair": "missing"}, self.start, self.end, self.size)
        with self.assertRaises(ValueError):
            render_pose(self.layers, {}, self.start, self.end, self.size)


if __name__ == "__main__":
    unittest.main()
