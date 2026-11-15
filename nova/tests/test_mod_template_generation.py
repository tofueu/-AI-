"""Regression tests for the NOVA blank MOD authoring templates.

Run: python -m unittest discover -s nova/tests -p 'test_mod_template_generation.py'
"""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from nova.tools import make_mod_templates as templates


class TemplateGenerationTests(unittest.TestCase):
    def test_both_profiles_generate_valid_transparent_layers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            outputs = templates.generate(root)
            self.assertEqual(len(outputs), len(templates.PROFILES) * (len(templates.SLOTS) + 1))
            for profile, spec in templates.PROFILES.items():
                folder = root / profile
                manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["profile"], profile)
                self.assertEqual(manifest["joints"], spec["joints"])
                self.assertEqual(manifest["canvas"], spec["canvas"])
                self.assertEqual([layer["slot"] for layer in manifest["layers"]], list(templates.SLOTS))
                for slot in templates.SLOTS:
                    with Image.open(folder / (slot + ".png")) as image:
                        self.assertEqual(image.mode, "RGBA")
                        self.assertEqual(image.size, tuple(spec["canvas"]))
                        self.assertIsNone(image.getchannel("A").getbbox())

    def test_existing_art_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / "chibi"
            folder.mkdir()
            original = folder / "hair_front.png"
            original.write_bytes(b"original user art")
            with self.assertRaises(FileExistsError):
                templates.generate(root)
            self.assertEqual(original.read_bytes(), b"original user art")
            self.assertFalse((root / "adult").exists())

    def test_failure_during_second_profile_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            real_save = Image.Image.save
            count = 0

            def fail_on_adult(image, fp, *args, **kwargs):
                nonlocal count
                count += 1
                if count == len(templates.SLOTS) + 1:
                    raise OSError("simulated PNG encoder failure")
                return real_save(image, fp, *args, **kwargs)

            with patch.object(Image.Image, "save", fail_on_adult):
                with self.assertRaisesRegex(OSError, "simulated PNG"):
                    templates.generate(root)
            for profile in templates.PROFILES:
                self.assertFalse((root / profile).exists())
            self.assertEqual(list(root.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
