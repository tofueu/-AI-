"""Smoke tests for the user-facing MOD animation export CLI."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.export_mod_animation import export_animation, main


class ExportModAnimationTests(unittest.TestCase):
    def test_chibi_and_adult_cli_exports_and_no_overwrite(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                mod = create_template(root / "mod", variant)
                manifest_file = mod / "manifest.json"
                manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
                manifest["require_clothes"] = False
                manifest["hidden_slots"] = [name for name in manifest["layers"] if name != "full_character"]
                manifest_file.write_text(json.dumps(manifest), encoding="utf-8")
                image_path = mod / manifest["layers"]["full_character"]
                with Image.open(image_path) as source:
                    image = source.convert("RGBA")
                image.putpixel((image.width // 2, image.height // 2), (255, 0, 160, 255))
                image.save(image_path)
                rig = json.loads((mod / "rig.json").read_text(encoding="utf-8"))
                hip = rig["joints"]["hip"]
                timeline = root / "motion.json"
                timeline.write_text(json.dumps({
                    "duration_ms": 1000,
                    "frames": [
                        {"time_ms": 0, "joints": {}},
                        {"time_ms": 500, "joints": {"hip": [hip[0] + 0.1, hip[1]]}}
                    ]
                }), encoding="utf-8")
                gif = root / "motion.gif"
                main([str(mod), str(timeline), str(gif), "--fps", "2"])
                with Image.open(gif) as result:
                    self.assertEqual(result.n_frames, 2)
                with self.assertRaises(FileExistsError):
                    export_animation(mod, timeline, gif, fps=2)
                png_dir = root / "frames"
                export_animation(mod, timeline, png_dir, format="png", fps=2)
                self.assertEqual(len(list(png_dir.glob("frame_*.png"))), 2)
                with self.assertRaises(FileExistsError):
                    export_animation(mod, timeline, png_dir, format="png", fps=2)

    def test_invalid_format_and_timeline(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mod = create_template(root / "mod", "chibi")
            timeline = root / "bad.json"
            timeline.write_text("[]", encoding="utf-8")
            with self.assertRaises(ValueError):
                export_animation(mod, timeline, root / "bad.gif")
            timeline.write_text('{"duration_ms": 1000, "frames": []}', encoding="utf-8")
            with self.assertRaises(ValueError):
                export_animation(mod, timeline, root / "bad.bin", format="gif")


if __name__ == "__main__":
    unittest.main()
