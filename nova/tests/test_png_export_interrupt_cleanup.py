"""Regression: interrupted PNG export must not leave a partial frame directory."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.rig_layer_preview import export_png_frames


class InterruptedFrame:
    def save(self, *args, **kwargs):
        raise KeyboardInterrupt("simulated interrupted encoder")


class InterruptedPngExportTests(unittest.TestCase):
    def test_interrupt_removes_new_directory_without_touching_source(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source"
            source.mkdir()
            sentinel = source / "keep.txt"
            sentinel.write_text("original", encoding="utf-8")
            target = root / "output"
            with patch("nova.tools.rig_layer_preview.render_frames", return_value=[InterruptedFrame()]):
                with self.assertRaises(KeyboardInterrupt):
                    export_png_frames(source, {}, target)
            self.assertFalse(target.exists())
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "original")


if __name__ == "__main__":
    unittest.main()
