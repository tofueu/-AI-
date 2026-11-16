"""Regression coverage for lossless NOVA rig PNG sequence exports."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.export_rig_png_frames import export_rig_png_frames


class ExportRigPngFramesTests(unittest.TestCase):
    def test_transparent_frames_manifest_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "frames"
            a = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
            b = a.copy()
            b.putpixel((4, 5), (180, 20, 240, 255))
            with patch("nova.tools.export_rig_png_frames.render_sequence",
                       return_value=[a, b]):
                export_rig_png_frames({}, {}, [], (16, 16), output,
                                      frame_duration_ms=80, loop=False)
                with self.assertRaises(FileExistsError):
                    export_rig_png_frames({}, {}, [], (16, 16), output)
            manifest = json.loads((output / "animation.json").read_text())
            self.assertEqual(manifest["frames"], ["frame_0000.png", "frame_0001.png"])
            self.assertEqual(manifest["frame_duration_ms"], 80)
            self.assertFalse(manifest["loop"])
            with Image.open(output / "frame_0000.png") as first:
                self.assertEqual(first.mode, "RGBA")
                self.assertEqual(first.getpixel((4, 5))[3], 0)
            with Image.open(output / "frame_0001.png") as second:
                self.assertEqual(second.getpixel((4, 5)), (180, 20, 240, 255))

    def test_invalid_duration_does_not_create_directory(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "frames"
            with self.assertRaises(ValueError):
                export_rig_png_frames({}, {}, [], (16, 16), output,
                                      frame_duration_ms=True)
            self.assertFalse(output.exists())


    def test_rejects_invalid_frames_without_creating_output(self):
        with tempfile.TemporaryDirectory() as root:
            for frames in (
                [Image.new("RGBA", (16, 16)), Image.new("RGB", (16, 16))],
                [Image.new("RGBA", (16, 16)), Image.new("RGBA", (8, 16))],
                [Image.new("RGBA", (16, 16)), object()],
            ):
                output = Path(root) / "frames"
                with patch("nova.tools.export_rig_png_frames.render_sequence",
                           return_value=frames):
                    with self.assertRaises(ValueError):
                        export_rig_png_frames({}, {}, [], (16, 16), output)
                self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
