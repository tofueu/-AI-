"""Integration tests for joint-driven GIF export."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.export_rig_gif import export_rig_gif


class RigGifExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "motion.gif"
        self.layer = Image.new("RGBA", (64, 64))
        for x in range(14, 19):
            for y in range(14, 19):
                self.layer.putpixel((x, y), (255, 0, 0, 255))
        self.layers = {"hair": self.layer}
        self.attachments = {"hair": "head"}
        self.poses = [
            {"head": (0.25, 0.25, 0)},
            {"head": (0.75, 0.25, 0)},
        ]

    def test_writes_animation_and_preserves_source(self):
        original = self.layer.tobytes()
        output = export_rig_gif(
            self.layers, self.attachments, self.poses, (64, 64),
            self.path, frames_per_segment=4, loop=False,
        )
        self.assertEqual(output, self.path)
        with Image.open(output) as gif:
            self.assertEqual(gif.format, "GIF")
            self.assertGreaterEqual(gif.n_frames, 2)
            self.assertEqual(gif.size, (64, 64))
        self.assertEqual(self.layer.tobytes(), original)

    def test_existing_output_not_overwritten(self):
        self.path.write_bytes(b"sentinel")
        with self.assertRaises(FileExistsError):
            export_rig_gif(self.layers, self.attachments, self.poses,
                           (64, 64), self.path)
        self.assertEqual(self.path.read_bytes(), b"sentinel")

    def test_invalid_duration_does_not_create_output(self):
        with self.assertRaises(ValueError):
            export_rig_gif(self.layers, self.attachments, self.poses,
                           (64, 64), self.path, frame_duration_ms=0)
        self.assertFalse(self.path.exists())


if __name__ == "__main__":
    unittest.main()
