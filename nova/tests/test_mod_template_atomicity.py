"""Regression tests for atomic blank MOD template export."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nova.tools.create_mod_templates import create_templates


class TemplateAtomicityTests(unittest.TestCase):
    def test_existing_variant_directory_is_not_modified(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            existing = root / "chibi"
            existing.mkdir()
            sentinel = existing / "custom.png"
            sentinel.write_bytes(b"original")
            with self.assertRaises(FileExistsError):
                create_templates(root, variants=["chibi"])
            self.assertEqual(sentinel.read_bytes(), b"original")
            self.assertEqual(sorted(p.name for p in existing.iterdir()), ["custom.png"])

    def test_failure_in_second_variant_removes_both_new_directories(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            from nova.tools import create_mod_templates as module
            original_save = module.Image.Image.save
            calls = 0

            def fail_on_second_variant(image, fp, *args, **kwargs):
                nonlocal calls
                calls += 1
                if "adult" in str(fp):
                    raise OSError("simulated disk failure")
                return original_save(image, fp, *args, **kwargs)

            with patch.object(module.Image.Image, "save", fail_on_second_variant):
                with self.assertRaises(OSError):
                    create_templates(root)
            self.assertFalse((root / "chibi").exists())
            self.assertFalse((root / "adult").exists())

    def test_success_creates_both_manifests(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            create_templates(root)
            self.assertTrue((root / "chibi" / "manifest.json").is_file())
            self.assertTrue((root / "adult" / "manifest.json").is_file())


if __name__ == "__main__":
    unittest.main()
