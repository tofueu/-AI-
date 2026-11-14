"""Check both NOVA blank-template variants using real PNG decoding."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import SIZES, SLOTS, create_template


class TemplateImageIntegrityTests(unittest.TestCase):
    def test_both_variants_have_correct_transparent_rgba_layers_and_rig(self):
        for variant, expected_size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                folder = create_template(Path(tmp) / variant, variant)
                manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
                rig = json.loads((folder / "rig.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["variant"], variant)
                self.assertEqual(manifest["canvas"], list(expected_size))
                self.assertEqual(set(manifest["layers"]), set(SLOTS))
                self.assertEqual(rig["variant"], variant)
                self.assertEqual(rig["coordinate_system"], "normalized_xy")
                for name, xy in rig["joints"].items():
                    self.assertEqual(len(xy), 2, name)
                    self.assertTrue(all(0 <= value <= 1 for value in xy), name)
                for slot, filename in manifest["layers"].items():
                    with Image.open(folder / filename) as layer:
                        self.assertEqual(layer.format, "PNG", slot)
                        self.assertEqual(layer.mode, "RGBA", slot)
                        self.assertEqual(layer.size, expected_size, slot)
                        self.assertIsNone(layer.getbbox(), slot)


if __name__ == "__main__":
    unittest.main()
