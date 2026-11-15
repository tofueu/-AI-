"""Regression tests for the two NOVA authoring template profiles."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.make_mod_templates import PROFILES, SLOTS, generate


class TemplateTests(unittest.TestCase):
    def test_both_profiles_have_transparent_layers_and_rig(self):
        with tempfile.TemporaryDirectory() as temp:
            outputs = generate(temp)
            self.assertEqual(len(outputs), 2 * (len(SLOTS) + 1))
            for profile, spec in PROFILES.items():
                root = Path(temp) / profile
                manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["canvas"], spec["canvas"])
                self.assertEqual(manifest["joints"], spec["joints"])
                self.assertEqual([x["slot"] for x in manifest["layers"]], list(SLOTS))
                for slot in SLOTS:
                    with Image.open(root / (slot + ".png")) as image:
                        self.assertEqual(image.mode, "RGBA")
                        self.assertEqual(list(image.size), spec["canvas"])
                        self.assertIsNone(image.getchannel("A").getbbox())

    def test_existing_artwork_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            generate(temp)
            original = Path(temp) / "chibi" / "hair_front.png"
            before = original.read_bytes()
            with self.assertRaises(FileExistsError):
                generate(temp)
            self.assertEqual(original.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
