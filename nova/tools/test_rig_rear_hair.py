"""Regression test: rear hair must be composited behind the character body."""
import unittest
from PIL import Image

try:
    from .rig_animator import render_frame
except ImportError:
    from rig_animator import render_frame


class RearHairLayerOrderTests(unittest.TestCase):
    def test_rear_hair_is_behind_body_independent_of_input_order(self):
        rig = {
            'canvas': [32, 32],
            'joints': {'root': {'parent': None, 'pivot': [0.5, 0.5]}},
            'slot_joints': {'body': 'root', 'hair_back': 'root'},
        }
        red_hair = Image.new('RGBA', (32, 32), (255, 0, 0, 255))
        blue_body = Image.new('RGBA', (32, 32), (0, 0, 255, 255))
        for layers in (
            {'body': blue_body, 'hair_back': red_hair},
            {'hair_back': red_hair, 'body': blue_body},
        ):
            with self.subTest(order=list(layers)):
                frame = render_frame(rig, layers, {})
                self.assertEqual(frame.getpixel((16, 16)), (0, 0, 255, 255))


if __name__ == '__main__':
    unittest.main()
