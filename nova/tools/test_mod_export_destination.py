"""Regression tests for preserving the source MOD folder during export."""
import tempfile
import unittest
from pathlib import Path

try:
    from .mod_package import export_mod
except ImportError:
    from mod_package import export_mod


class ExportDestinationTests(unittest.TestCase):
    def test_rejects_archive_inside_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source"
            source.mkdir()
            (source / "mod.json").write_text("{}", encoding="utf-8")
            (source / "rig.json").write_text("{}", encoding="utf-8")
            before = sorted(p.name for p in source.iterdir())
            output = source / "output.nova-mod"
            with self.assertRaisesRegex(ValueError, "outside source"):
                export_mod(source, output)
            self.assertFalse(output.exists())
            self.assertEqual(before, sorted(p.name for p in source.iterdir()))

    def test_rejects_nested_output_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source"
            source.mkdir()
            (source / "mod.json").write_text("{}", encoding="utf-8")
            (source / "rig.json").write_text("{}", encoding="utf-8")
            output = source / "nested" / "output.nova-mod"
            with self.assertRaisesRegex(ValueError, "outside source"):
                export_mod(source, output)
            self.assertFalse(output.parent.exists())


if __name__ == "__main__":
    unittest.main()
