"""Full-character PNG replacement is available for both NOVA proportions."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames


class FullCharacterModTests(unittest.TestCase):
    def test_full_character_slot_and_hip_translation(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                self.assertIn("full_character", manifest["layers"])
                self.assertTrue((root / manifest["layers"]["full_character"]).is_file())
                manifest["require_clothes"] = False
                manifest["hidden_slots"] = [
                    slot for slot in manifest["layers"] if slot != "full_character"
                ]
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                width, height = manifest["canvas"]
                image = Image.new("RGBA", (width, height))
                image.putpixel((width // 2, height // 2), (255, 0, 255, 255))
                image.save(root / manifest["layers"]["full_character"])
                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                hip = rig["joints"]["hip"]
                timeline = {"duration_ms": 1000, "frames": [
                    {"time_ms": 0, "joints": {"hip": hip}},
                    {"time_ms": 500, "joints": {"hip": [hip[0] + 0.1, hip[1]]}},
                ]}
                frames = render_frames(root, timeline, fps=2)
                self.assertEqual(len(frames), 2)
                self.assertEqual(frames[0].getpixel((width // 2, height // 2)), (255, 0, 255, 255))
                self.assertNotEqual(frames[0].getbbox(), frames[1].getbbox())


if __name__ == "__main__":
    unittest.main()
