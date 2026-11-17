"""Security regression tests for NOVA MOD template output ancestry."""
import tempfile
import unittest
from pathlib import Path

from nova.tools.create_mod_templates import create_templates


class TemplateDestinationTests(unittest.TestCase):
    def test_symlinked_parent_does_not_write_into_target(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            real = root / "real"
            real.mkdir()
            alias = root / "alias"
            try:
                alias.symlink_to(real, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("directory symlinks not available")
            with self.assertRaisesRegex(ValueError, "symlink"):
                create_templates(alias / "nested")
            self.assertEqual(list(real.iterdir()), [])

    def test_regular_nested_directory_is_allowed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "nested" / "templates"
            create_templates(root, variants=["chibi"])
            self.assertTrue((root / "chibi" / "manifest.json").is_file())

    def test_existing_regular_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "occupied"
            root.write_text("preserve", encoding="utf-8")
            with self.assertRaises(NotADirectoryError):
                create_templates(root, variants=["chibi"])
            self.assertEqual(root.read_text(encoding="utf-8"), "preserve")


if __name__ == "__main__":
    unittest.main()
