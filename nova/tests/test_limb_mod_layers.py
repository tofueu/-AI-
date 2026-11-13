"""Both MOD proportions expose independent limb layers and animate them."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.rig_layer_preview import render_frames


class LimbLayerTests(unittest.TestCase):
    def test_limb_slots_move_with_corresponding_joints(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = create_template(Path(tmp) / "mod", variant)
                manifest_path = root / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["require_clothes"] = False
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                for slot in ("arm_left", "arm_right", "leg_left", "leg_right"):
                    self.assertIn(slot, manifest["layers"])
                    self.assertTrue((root / manifest["layers"][slot]).exists())
                width, height = manifest["canvas"]
                layer = Image.new("RGBA", (width, height))
                layer.putpixel((width // 2, height // 2), (255, 0, 0, 255))
                layer.save(root / manifest["layers"]["arm_left"])
                rig = json.loads((root / "rig.json").read_text(encoding="utf-8"))
                left = rig["joints"]["left_hand"]
                timeline = {"duration_ms": 1000, "frames": [
                    {"time_ms": 0, "joints": {"left_hand": left}},
                    {"time_ms": 500, "joints": {"left_hand": [left[0] + 0.1, left[1]]}},
                ]}
                frames = render_frames(root, timeline, fps=2)
                self.assertEqual(len(frames), 2)
                self.assertNotEqual(frames[0].getbbox(), frames[1].getbbox())


if __name__ == "__main__":
    unittest.main()
