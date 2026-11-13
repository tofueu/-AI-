"""Check NOVA exported PNG frames actually follow authored hip motion."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import export_png_frames


class PngMotionExportTests(unittest.TestCase):
    def test_full_character_motion_for_both_variants(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_file = root / "manifest.json"
                manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
                manifest["require_clothes"] = False
                manifest["hidden_slots"] = [
                    slot for slot in manifest["layers"] if slot != "full_character"
                ]
                manifest_file.write_text(json.dumps(manifest), encoding="utf-8")
                character = root / manifest["layers"]["full_character"]
                with Image.open(character) as image:
                    painted = image.convert("RGBA")
                width, height = painted.size
                x, y = width // 2, height // 2
                painted.putpixel((x, y), (170, 80, 220, 255))
                painted.save(character, format="PNG")

                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                hip = rig["joints"]["hip"]
                # Two frames at 2 fps; shift hip 10% right at the second keyframe.
                timeline = {"duration_ms": 1000, "frames": [
                    {"time_ms": 0, "joints": {}},
                    {"time_ms": 500, "joints": {
                        "hip": [hip[0] + 0.1, hip[1]]
                    }},
                ]}
                output = export_png_frames(root, timeline, Path(tmp) / "frames", fps=2)
                with Image.open(output / "frame_0000.png") as first_image:
                    first = first_image.convert("RGBA")
                with Image.open(output / "frame_0001.png") as second_image:
                    second = second_image.convert("RGBA")
                shift = round(0.1 * width)
                self.assertEqual(first.getpixel((x, y)), (170, 80, 220, 255))
                self.assertEqual(second.getpixel((x + shift, y)), (170, 80, 220, 255))
                self.assertEqual(second.getpixel((x, y))[3], 0)
                self.assertEqual(first.getpixel((x + shift, y))[3], 0)


if __name__ == "__main__":
    unittest.main()
