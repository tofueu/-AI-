"""Regression tests for NOVA layering and transparent MOD validation."""
import unittest
from PIL import Image
try:
    from .rig_animator import render_frame
except ImportError:
    from rig_animator import render_frame


class LayeringTests(unittest.TestCase):
    def setUp(self):
        self.rig = {
            'canvas': [16, 16],
            'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
            'slot_joints': {'body': 'root', 'hair_back': 'root', 'head': 'root'},
        }

    def solid(self, color, size=(16, 16)):
        return Image.new('RGBA', size, color)

    def test_back_hair_is_behind_head_independent_of_manifest_order(self):
        layers = {
            'head': self.solid((255, 0, 0, 255)),
            'hair_back': self.solid((0, 0, 255, 255)),
            'body': self.solid((0, 255, 0, 255)),
        }
        self.assertEqual(render_frame(self.rig, layers, {}).getpixel((8, 8)),
                         (255, 0, 0, 255))

    def test_transparent_wrong_size_is_rejected(self):
        layers = {
            'body': self.solid((0, 255, 0, 255)),
            'head': self.solid((0, 0, 0, 0), (8, 8)),
        }
        with self.assertRaisesRegex(ValueError, 'Layer size mismatch'):
            render_frame(self.rig, layers, {})


if __name__ == '__main__':
    unittest.main()
