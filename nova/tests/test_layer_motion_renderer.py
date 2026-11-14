"""Integration tests for actual PNG/GIF rendering with the real motion sampler."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.layer_motion_renderer import render_frames

RIG = {
    "variant": "chibi", "coordinate_system": "normalized_xy",
    "canvas": [64, 64], "joints": {"head": [0.5, 0.5]},
}
MOTION = {
    "variant": "chibi", "coordinate_system": "normalized_xy_offsets",
    "clips": {"idle": [
        {"frame": 0, "offsets": {"head": [0, 0]}},
        {"frame": 2, "offsets": {"head": [0.125, 0]}},
        {"frame": 4, "offsets": {"head": [0, 0]}},
    ]},
}


class RendererIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "mod"
        self.source.mkdir()
        Image.new("RGBA", (8, 8), (255, 0, 0, 255)).save(self.source / "head.png")
        self.layers = [{"file": "head.png", "joint": "head", "anchor": [4, 4]}]

    def test_render_png_and_animated_gif_with_real_sampler(self):
        output = self.root / "render"
        render_frames(RIG, MOTION, self.layers, self.source, "idle", output, frame_count=4)
        pngs = sorted(output.glob("frame_*.png"))
        self.assertEqual(len(pngs), 4)
        with Image.open(pngs[0]) as frame:
            self.assertEqual(frame.getpixel((32, 32)), (255, 0, 0, 255))
            self.assertEqual(frame.getpixel((40, 32))[3], 0)
        with Image.open(pngs[2]) as frame:
            self.assertEqual(frame.getpixel((40, 32)), (255, 0, 0, 255))
        with Image.open(output / "preview.gif") as gif:
            self.assertEqual(gif.n_frames, 4)
            self.assertEqual(gif.info["loop"], 0)
        self.assertTrue((self.source / "head.png").is_file())

    def test_hidden_layer_and_source_protection(self):
        with self.assertRaises(ValueError):
            render_frames(RIG, MOTION, self.layers, self.source, "idle", self.source / "output")
        with self.assertRaises(ValueError):
            render_frames(RIG, MOTION, [{**self.layers[0], "visible": False}],
                          self.source, "idle", self.root / "hidden")
        self.assertFalse((self.root / "hidden").exists())

    def test_path_escape_rejected_before_output(self):
        with self.assertRaises(ValueError):
            render_frames(RIG, MOTION, [{**self.layers[0], "file": "../outside.png"}],
                          self.source, "idle", self.root / "unsafe")
        self.assertFalse((self.root / "unsafe").exists())


if __name__ == "__main__":
    unittest.main()
