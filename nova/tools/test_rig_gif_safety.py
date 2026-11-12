"""Validation and non-destructive output regressions for NOVA GIF export."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

try:
    from .rig_gif import export_gif
except ImportError:
    from rig_gif import export_gif


class GifExportSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.frame = Image.new("RGBA", (12, 12), (220, 90, 160, 255))
        self.destination = self.root / "preview.gif"

    def test_rejects_mismatched_canvas_without_creating_file(self):
        other = Image.new("RGBA", (13, 12), (0, 0, 0, 0))
        with self.assertRaises(ValueError):
            export_gif([self.frame, other], self.destination)
        self.assertFalse(self.destination.exists())

    def test_rejects_empty_and_non_image_frames(self):
        for frames in ([], [self.frame, object()]):
            with self.subTest(frames=len(frames)):
                with self.assertRaises((ValueError, TypeError)):
                    export_gif(frames, self.destination)
                self.assertFalse(self.destination.exists())

    def test_rejects_invalid_duration_and_loop(self):
        for duration in (0, 19, 60001, 100.5, True):
            with self.subTest(duration=duration):
                with self.assertRaises(ValueError):
                    export_gif([self.frame], self.destination, duration_ms=duration)
        for loop in (-1, 65536, 0.5, True):
            with self.subTest(loop=loop):
                with self.assertRaises(ValueError):
                    export_gif([self.frame], self.destination, loop=loop)
        self.assertFalse(self.destination.exists())

    def test_existing_file_is_never_modified(self):
        original = b"DO NOT REPLACE"
        self.destination.write_bytes(original)
        with self.assertRaises(FileExistsError):
            export_gif([self.frame], self.destination)
        self.assertEqual(self.destination.read_bytes(), original)

    def test_does_not_mutate_source_frame(self):
        before = self.frame.tobytes()
        export_gif([self.frame], self.destination)
        self.assertEqual(self.frame.tobytes(), before)
        with Image.open(self.destination) as gif:
            self.assertEqual(gif.size, self.frame.size)


if __name__ == "__main__":
    unittest.main()
