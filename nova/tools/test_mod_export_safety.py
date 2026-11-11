"""Export validation regression tests: no silent omission or ambiguous filenames."""
import tempfile
import unittest
from pathlib import Path

try:
    from .mod_package import export_mod
except ImportError:
    from mod_package import export_mod


class ModExportSafetyTests(unittest.TestCase):
    def _base(self, root):
        source = root / 'source'
        source.mkdir()
        (source / 'mod.json').write_text('{}', encoding='utf-8')
        (source / 'rig.json').write_text('{}', encoding='utf-8')
        return source

    def test_rejects_nested_directory_instead_of_silently_omitting(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self._base(root)
            (source / 'nested').mkdir()
            output = root / 'export.nova-mod'
            with self.assertRaisesRegex(ValueError, 'unsupported entries'):
                export_mod(source, output)
            self.assertFalse(output.exists())

    def test_rejects_case_colliding_png_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self._base(root)
            (source / 'Hair.png').write_bytes(b'a')
            (source / 'hair.PNG').write_bytes(b'b')
            output = root / 'export.nova-mod'
            # Case-insensitive filesystems cannot represent both spellings.
            if len(list(source.iterdir())) < 4:
                self.skipTest('Case-insensitive filesystem')
            with self.assertRaisesRegex(ValueError, 'Case-colliding'):
                export_mod(source, output)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
