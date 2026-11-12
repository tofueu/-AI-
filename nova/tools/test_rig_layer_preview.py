"""Integration checks for rigid-layer NOVA animation preview."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames, export_gif


class RigLayerPreviewTests(unittest.TestCase):
    def test_both_variants_move_head_without_changing_sources(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / variant, variant)
                manifest = json.loads((root / "manifest.json").read_text())
                size = tuple(manifest["canvas"])
                source = Image.new("RGBA", size)
                source.putpixel((size[0] // 2, 30), (255, 0, 0, 255))
                source.save(root / "head.png")
                before = (root / "head.png").read_bytes()
                rig = json.loads((root / "rig.json").read_text())
                x, y = rig["joints"]["head"]
                timeline = {"duration_ms": 1000, "loop": False, "frames": [
                    {"time_ms": 0, "joints": {"head": [x, y]}},
                    {"time_ms": 500, "joints": {"head": [x, y + 0.1]}}
                ]}
                frames = render_frames(root, timeline, fps=4)
                self.assertEqual(len(frames), 4)
                self.assertEqual(frames[0].getpixel((size[0] // 2, 30)), (255, 0, 0, 255))
                self.assertEqual(frames[2].getpixel((size[0] // 2, 30)), (0, 0, 0, 0))
                self.assertEqual((root / "head.png").read_bytes(), before)
                dest = root / "preview.gif"
                export_gif(root, timeline, dest, fps=4)
                self.assertTrue(dest.is_file())
                with self.assertRaises(FileExistsError):
                    export_gif(root, timeline, dest, fps=4)

    def test_reject_escape_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = create_template(Path(tmp) / "mod", "chibi")
            manifest = json.loads((root / "manifest.json").read_text())
            manifest["layers"]["head"] = "../outside.png"
            (root / "manifest.json").write_text(json.dumps(manifest))
            timeline = {"duration_ms": 1000, "frames": [{"time_ms": 0, "joints": {}}]}
            with self.assertRaises(ValueError):
                render_frames(root, timeline)


if __name__ == "__main__":
    unittest.main()
