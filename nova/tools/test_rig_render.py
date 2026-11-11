import unittest
from PIL import Image
try:
    from .rig_render import render_pose, render_loop
except ImportError:
    from rig_render import render_pose, render_loop

class RigRenderTests(unittest.TestCase):
    def test_translation_and_unchanged_source(self):
        source = Image.new('RGBA', (8, 8))
        source.putpixel((2, 2), (255, 0, 0, 255))
        parts = [{'image': source, 'joint': 'head', 'pivot': (2, 2)}]
        rendered = render_pose(parts, {'head': (3, 1, 0)}, (8, 8))
        self.assertEqual(rendered.getpixel((5, 3)), (255, 0, 0, 255))
        self.assertEqual(source.getpixel((2, 2)), (255, 0, 0, 255))

    def test_empty_layer_and_loop(self):
        parts = [{'image': Image.new('RGBA', (8, 8)), 'joint': 'head', 'pivot': (0, 0)}]
        frames = [{'time': 0, 'pose': {'head': [0,0,0]}}, {'time': 1, 'pose': {'head': [0,0,0]}}]
        result = render_loop(parts, frames, (8, 8), 4)
        self.assertEqual(len(result), 4)
        self.assertIsNone(result[0].getbbox())

    def test_invalid_canvas(self):
        with self.assertRaises(ValueError):
            render_pose([], {}, (0, 8))

if __name__ == '__main__':
    unittest.main()
