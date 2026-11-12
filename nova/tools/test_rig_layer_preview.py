"""Integration checks for rigid-layer NOVA animation preview."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from unittest.mock import patch
from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames, export_gif, export_png_frames


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

    def test_failed_gif_encoder_leaves_no_partial_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = create_template(Path(tmp) / "mod", "chibi")
            timeline = {"duration_ms": 1000, "frames": [
                {"time_ms": 0, "joints": {}}
            ]}
            target = Path(tmp) / "preview.gif"
            with patch.object(Image.Image, "save", side_effect=OSError("encoder failed")):
                with self.assertRaisesRegex(OSError, "encoder failed"):
                    export_gif(root, timeline, target, fps=2)
            self.assertFalse(target.exists())
            self.assertEqual(list(Path(tmp).glob(".nova-preview-*.gif")), [])

    def test_existing_gif_remains_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = create_template(Path(tmp) / "mod", "chibi")
            timeline = {"duration_ms": 1000, "frames": [
                {"time_ms": 0, "joints": {}}
            ]}
            target = Path(tmp) / "preview.gif"
            target.write_bytes(b"existing user content")
            with self.assertRaises(FileExistsError):
                export_gif(root, timeline, target, fps=2)
            self.assertEqual(target.read_bytes(), b"existing user content")
            self.assertEqual(list(Path(tmp).glob(".nova-preview-*.gif")), [])

    def test_png_sequence_preserves_transparency_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = create_template(Path(tmp) / "mod", "chibi")
            timeline = {"duration_ms": 1000, "frames": [{"time_ms": 0, "joints": {}}]}
            target = Path(tmp) / "frames"
            export_png_frames(root, timeline, target, fps=3)
            paths = sorted(target.glob("frame_*.png"))
            self.assertEqual(len(paths), 3)
            with Image.open(paths[0]) as frame:
                self.assertEqual(frame.mode, "RGBA")
                self.assertEqual(frame.getpixel((0, 0))[3], 0)
            with self.assertRaises(FileExistsError):
                export_png_frames(root, timeline, target, fps=3)
            self.assertEqual(len(list(target.iterdir())), 3)

    def test_png_encoder_failure_cleans_new_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = create_template(Path(tmp) / "mod", "adult")
            timeline = {"duration_ms": 1000, "frames": [{"time_ms": 0, "joints": {}}]}
            target = Path(tmp) / "frames"
            with patch.object(Image.Image, "save", side_effect=OSError("PNG encoder failed")):
                with self.assertRaisesRegex(OSError, "PNG encoder failed"):
                    export_png_frames(root, timeline, target, fps=2)
            self.assertFalse(target.exists())

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
