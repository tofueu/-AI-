import tempfile
import unittest
from pathlib import Path
from PIL import Image
try:
    from .rig_pipeline import export_rig_animation
except ImportError:
    from rig_pipeline import export_rig_animation


class PipelineTests(unittest.TestCase):
    def test_render_gif_and_preserve_source(self):
        layer = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
        layer.putpixel((2, 2), (255, 0, 0, 255))
        parts = [{"image": layer, "joint": "head", "pivot": (6, 6)}]
        keyframes = [{"time": 0, "pose": {"head": [0, 0, 0]}},
                     {"time": 0.5, "pose": {"head": [4, 0, 0]}},
                     {"time": 1, "pose": {"head": [0, 0, 0]}}]
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "head.gif"
            self.assertEqual(export_rig_animation(parts, keyframes, (12, 12), 4, path), path)
            with Image.open(path) as gif:
                self.assertGreaterEqual(gif.n_frames, 2)
                self.assertEqual(gif.info["loop"], 0)
            self.assertEqual(layer.getpixel((2, 2)), (255, 0, 0, 255))
            with self.assertRaises(FileExistsError):
                export_rig_animation(parts, keyframes, (12, 12), 4, path)

    def test_invalid_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "x.gif"
            with self.assertRaises(ValueError):
                export_rig_animation([], [], (12, 12), 4, path)
            with self.assertRaises(ValueError):
                export_rig_animation([{}], [], (12, 12), 1, path)
            with self.assertRaises(ValueError):
                export_rig_animation([{}], [], (12, 12), 4, path, duration_ms=0)
