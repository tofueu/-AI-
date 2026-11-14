"""Regression tests for atomic, non-destructive blank MOD template creation."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.create_mod_template import create_template, SLOTS


class TemplateAtomicityTests(unittest.TestCase):
    def test_rejects_existing_empty_folder_without_touching_it(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "artist"
            destination.mkdir()
            with self.assertRaises(FileExistsError):
                create_template(destination, "chibi")
            self.assertTrue(destination.is_dir())
            self.assertEqual(list(destination.iterdir()), [])

    def test_failed_png_generation_rolls_back_only_new_folder(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "original.png"
            source.write_bytes(b"original")
            destination = Path(tmp) / "new-template"
            with patch("nova.tools.create_mod_template.Image.new", side_effect=OSError("encoder failed")):
                with self.assertRaisesRegex(OSError, "encoder failed"):
                    create_template(destination, "adult")
            self.assertFalse(destination.exists())
            self.assertEqual(source.read_bytes(), b"original")

    def test_success_writes_all_transparent_layers(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "new-template"
            create_template(destination, "chibi")
            self.assertEqual(len(list(destination.glob("*.png"))), len(SLOTS))
            self.assertTrue((destination / "manifest.json").exists())
            self.assertTrue((destination / "rig.json").exists())


if __name__ == "__main__":
    unittest.main()
