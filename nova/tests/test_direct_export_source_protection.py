"""Direct exporters must never write inside a source MOD directory."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from nova.tools.rig_layer_preview import export_gif, export_png_frames


class DirectExportSourceProtectionTests(unittest.TestCase):
    def test_rejects_source_paths_before_creating_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mod = root / "mod"
            mod.mkdir()
            frame = Image.new("RGBA", (8, 8), (255, 0, 0, 255))
            with patch("nova.tools.rig_layer_preview.render_frames", return_value=[frame]):
                for exporter, destination in (
                    (export_gif, mod / "preview.gif"),
                    (export_png_frames, mod / "frames"),
                ):
                    with self.subTest(exporter=exporter.__name__):
                        with self.assertRaises(ValueError):
                            exporter(mod, {"duration_ms": 100}, destination)
                        self.assertFalse(destination.exists())

    def test_allows_exports_outside_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mod = root / "mod"
            mod.mkdir()
            frame = Image.new("RGBA", (8, 8), (255, 0, 0, 255))
            with patch("nova.tools.rig_layer_preview.render_frames", return_value=[frame]):
                gif = export_gif(mod, {}, root / "preview.gif")
                pngs = export_png_frames(mod, {}, root / "frames")
            self.assertTrue(gif.is_file())
            self.assertTrue((pngs / "frame_0000.png").is_file())


if __name__ == "__main__":
    unittest.main()
