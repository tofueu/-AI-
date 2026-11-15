"""Regression tests for the two NOVA authoring template profiles."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
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


    def test_failed_second_profile_rolls_back_both(self):
        with tempfile.TemporaryDirectory() as temp:
            original_new = Image.new
            calls = 0

            def fail_during_adult(*args, **kwargs):
                nonlocal calls
                calls += 1
                if calls == len(SLOTS) + 1:
                    raise OSError("simulated PNG encoder failure")
                return original_new(*args, **kwargs)

            with patch("nova.tools.make_mod_templates.Image.new", side_effect=fail_during_adult):
                with self.assertRaisesRegex(OSError, "simulated"):
                    generate(temp)
            self.assertFalse((Path(temp) / "chibi").exists())
            self.assertFalse((Path(temp) / "adult").exists())
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_corrupted_staged_png_prevents_publication(self):
        with tempfile.TemporaryDirectory() as temp:
            original_save = Image.Image.save
            calls = 0

            def corrupt_one_png(image, fp, *args, **kwargs):
                nonlocal calls
                calls += 1
                if calls == len(SLOTS) + 1:
                    Path(fp).write_bytes(b"not a PNG")
                    return None
                return original_save(image, fp, *args, **kwargs)

            with patch("nova.tools.make_mod_templates.Image.Image.save", new=corrupt_one_png):
                with self.assertRaises(Exception):
                    generate(temp)
            self.assertFalse((Path(temp) / "chibi").exists())
            self.assertFalse((Path(temp) / "adult").exists())
            self.assertEqual(list(Path(temp).iterdir()), [])


    def test_invalid_staged_rig_and_order_are_not_published(self):
        original_dumps = json.dumps
        for corruption in ("joints", "order"):
            with self.subTest(corruption=corruption), tempfile.TemporaryDirectory() as temp:
                def corrupt_manifest(value, *args, **kwargs):
                    if isinstance(value, dict) and value.get("profile") == "adult":
                        value = dict(value)
                        if corruption == "joints":
                            value["joints"] = {"root": [-1, -1]}
                        else:
                            value["layers"] = [dict(layer) for layer in value["layers"]]
                            value["layers"][0]["order"] = 99
                    return original_dumps(value, *args, **kwargs)

                with patch("nova.tools.make_mod_templates.json.dumps", side_effect=corrupt_manifest):
                    with self.assertRaisesRegex(ValueError, "invalid staged template"):
                        generate(temp)
                self.assertFalse((Path(temp) / "chibi").exists())
                self.assertFalse((Path(temp) / "adult").exists())
                self.assertEqual(list(Path(temp).iterdir()), [])

if __name__ == "__main__":
    unittest.main()
