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


    def test_unknown_files_in_existing_profile_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "adult"
            root.mkdir()
            artwork = root / "custom_hair.png"
            artwork.write_bytes(b"precious user artwork")
            with self.assertRaises(FileExistsError):
                generate(temp)
            self.assertEqual(artwork.read_bytes(), b"precious user artwork")
            self.assertFalse((Path(temp) / "chibi").exists())
            self.assertFalse((root / "manifest.json").exists())

    def test_empty_profile_directory_is_not_reused(self):
        with tempfile.TemporaryDirectory() as temp:
            (Path(temp) / "chibi").mkdir()
            with self.assertRaises(FileExistsError):
                generate(temp)
            self.assertFalse((Path(temp) / "adult").exists())


if __name__ == "__main__":
    unittest.main()
