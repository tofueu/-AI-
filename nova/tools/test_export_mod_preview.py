"""Smoke tests for the user-facing NOVA preview command."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.export_mod_preview import export_preview

TIMELINE = {"duration_ms": 200, "loop": False,
            "frames": [{"time_ms": 0, "joints": {}}]}


class PreviewCommandTests(unittest.TestCase):
    def test_png_export_and_no_overwrite_for_both_variants(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                base = Path(tmp)
                root = create_template(base / "mod", variant)
                size = (512, 512) if variant == "chibi" else (512, 768)
                Image.new("RGBA", size, (20, 30, 40, 255)).save(root / "clothes.png")
                timeline = base / "timeline.json"
                timeline.write_text(json.dumps(TIMELINE), encoding="utf-8")
                output = base / "frames"
                export_preview(root, timeline, output, fmt="png", fps=10)
                self.assertEqual(len(list(output.glob("frame_*.png"))), 2)
                with self.assertRaises(FileExistsError):
                    export_preview(root, timeline, output, fmt="png", fps=10)

    def test_gif_export_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            root = create_template(base / "mod", "chibi")
            Image.new("RGBA", (512, 512), (20, 30, 40, 255)).save(root / "clothes.png")
            timeline = base / "timeline.json"
            timeline.write_text(json.dumps(TIMELINE), encoding="utf-8")
            output = base / "preview.gif"
            export_preview(root, timeline, output, fps=10)
            with Image.open(output) as gif:
                self.assertEqual(gif.format, "GIF")
            original = output.read_bytes()
            with self.assertRaises(FileExistsError):
                export_preview(root, timeline, output, fps=10)
            self.assertEqual(output.read_bytes(), original)

    def test_reject_nonobject_timeline(self):
        with tempfile.TemporaryDirectory() as tmp:
            timeline = Path(tmp) / "timeline.json"
            timeline.write_text("[]", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "JSON object"):
                export_preview(tmp, timeline, Path(tmp) / "preview.gif")


if __name__ == "__main__":
    unittest.main()
