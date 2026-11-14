"""End-to-end smoke test: real Pillow encoders, not mocked exporters."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.render_motion_pack import render_motion_pack


class RealMotionPackSmokeTests(unittest.TestCase):
    def test_real_gif_and_png_exports_for_two_rig_scales(self):
        for size in (64, 96):
            with self.subTest(size=size), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                mod = root / "mod"
                mod.mkdir()
                joints = {
                    "head": [0.5, 0.25], "hip": [0.5, 0.5],
                    "right_hand": [0.7, 0.45], "left_hand": [0.3, 0.45],
                    "left_foot": [0.4, 0.8], "right_foot": [0.6, 0.8],
                }
                (mod / "rig.json").write_text(
                    json.dumps({"joints": joints}), encoding="utf-8"
                )
                (mod / "manifest.json").write_text(
                    json.dumps({"canvas": [size, size],
                                "layers": {"body": "body.png", "head": "head.png"}}),
                    encoding="utf-8",
                )
                for name, color in (("body.png", (80, 60, 180, 255)),
                                    ("head.png", (240, 190, 150, 255))):
                    image = Image.new("RGBA", (size, size))
                    x = size // 2
                    y = size // (3 if name == "head.png" else 2)
                    for px in range(x - 5, x + 5):
                        for py in range(y - 5, y + 5):
                            image.putpixel((px, py), color)
                    image.save(mod / name)
                original = {p.name: p.read_bytes() for p in mod.iterdir()}
                gifs = render_motion_pack(mod, root / "gifs", fps=8)
                pngs = render_motion_pack(mod, root / "pngs", format="png", fps=8)
                for motion in ("idle", "wave", "walk", "jump"):
                    with Image.open(gifs / (motion + ".gif")) as gif:
                        self.assertEqual(gif.format, "GIF")
                        self.assertEqual(gif.size, (size, size))
                        self.assertGreater(gif.n_frames, 1)
                    frames = sorted((pngs / motion).glob("frame_*.png"))
                    self.assertEqual(len(frames), 16)
                    with Image.open(frames[0]) as frame:
                        self.assertEqual(frame.mode, "RGBA")
                        self.assertEqual(frame.size, (size, size))
                self.assertEqual(
                    {p.name: p.read_bytes() for p in mod.iterdir()}, original
                )


if __name__ == "__main__":
    unittest.main()
