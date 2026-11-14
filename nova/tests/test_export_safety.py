"""Ensure export destinations never overlap the source MOD tree."""
import tempfile
import unittest
from pathlib import Path

from nova.tools.export_safety import validate_export_destination


class ExportSafetyTests(unittest.TestCase):
    def test_rejects_source_and_nested_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mod"
            root.mkdir()
            for target in (root, root / "previews", root / "nested" / "previews"):
                with self.assertRaises(ValueError):
                    validate_export_destination(root, target)

    def test_allows_sibling_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mod"
            root.mkdir()
            target = Path(tmp) / "previews"
            self.assertEqual(validate_export_destination(root, target), target)

    def test_rejects_symlink_into_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "mod"
            root.mkdir()
            alias = Path(tmp) / "alias"
            try:
                alias.symlink_to(root, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("directory symlinks unavailable")
            with self.assertRaises(ValueError):
                validate_export_destination(root, alias / "previews")

    def test_rejects_missing_source_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "preview"
            with self.assertRaises(FileNotFoundError):
                validate_export_destination(Path(tmp) / "missing", target)
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
