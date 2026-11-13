"""Regression checks for non-destructive NOVA PNG sequence export."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import export_png_frames


class PngSequenceExportTests(unittest.TestCase):
    def test_both_variants_export_without_mutating_source(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["require_clothes"] = False
                manifest["hidden_slots"] = [
                    slot for slot in manifest["layers"] if slot != "full_character"
                ]
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                character = root / manifest["layers"]["full_character"]
                with Image.open(character) as image:
                    painted = image.convert("RGBA")
                painted.putpixel((painted.width // 2, painted.height // 2),
                                 (128, 64, 255, 255))
                painted.save(character, format="PNG")
                original = {
                    path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                    for path in root.iterdir() if path.is_file()
                }
                timeline = {"duration_ms": 1000, "frames": [
                    {"time_ms": 0, "joints": {}},
                ]}
                target = Path(tmp) / "frames"
                result = export_png_frames(root, timeline, target, fps=2)
                self.assertEqual(result, target)
                outputs = sorted(target.glob("frame_*.png"))
                self.assertEqual(len(outputs), 2)
                for output in outputs:
                    with Image.open(output) as frame:
                        self.assertEqual(frame.format, "PNG")
                        self.assertEqual(frame.mode, "RGBA")
                        self.assertEqual(frame.size, tuple(manifest["canvas"]))
                self.assertEqual(original, {
                    path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                    for path in root.iterdir() if path.is_file()
                })
                with self.assertRaises(FileExistsError):
                    export_png_frames(root, timeline, target, fps=2)
                self.assertEqual(len(list(target.glob("frame_*.png"))), 2)


if __name__ == "__main__":
    unittest.main()
