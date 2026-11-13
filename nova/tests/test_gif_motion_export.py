"""Regression checks for NOVA GIF export and non-overwriting behavior."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import export_gif


class GifExportTests(unittest.TestCase):
    def test_both_variants_export_animated_gif_without_overwrite(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
                manifest["require_clothes"] = False
                manifest["hidden_slots"] = [
                    slot for slot in manifest["layers"] if slot != "full_character"
                ]
                (root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
                character = root / manifest["layers"]["full_character"]
                with Image.open(character) as image:
                    painted = image.convert("RGBA")
                width, height = painted.size
                x, y = width // 2, height // 2
                painted.putpixel((x, y), (255, 0, 160, 255))
                painted.save(character, format="PNG")

                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                hip = rig["joints"]["hip"]
                timeline = {"duration_ms": 1000, "frames": [
                    {"time_ms": 0, "joints": {}},
                    {"time_ms": 500, "joints": {"hip": [hip[0] + 0.1, hip[1]]}},
                ]}
                destination = Path(tmp) / "preview.gif"
                export_gif(root, timeline, destination, fps=2)
                original_bytes = destination.read_bytes()
                with Image.open(destination) as gif:
                    self.assertEqual(gif.format, "GIF")
                    self.assertEqual(gif.n_frames, 2)
                    gif.seek(0)
                    first = gif.convert("RGBA")
                    gif.seek(1)
                    second = gif.convert("RGBA")
                self.assertNotEqual(first.tobytes(), second.tobytes())
                self.assertEqual(first.getpixel((x, y))[:3], (255, 0, 160))
                self.assertEqual(second.getpixel((x + round(width * 0.1), y))[:3], (255, 0, 160))
                with self.assertRaises(FileExistsError):
                    export_gif(root, timeline, destination, fps=2)
                self.assertEqual(destination.read_bytes(), original_bytes)


if __name__ == "__main__":
    unittest.main()
