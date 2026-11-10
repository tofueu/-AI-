"""MOD package round-trip, immutability and archive traversal regression tests."""
import json
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path

try:
    from .mod_package import export_mod, import_mod
except ImportError:
    from mod_package import export_mod, import_mod


class ModPackageTests(unittest.TestCase):
    def test_round_trip_preserves_assets_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / 'original'
            src.mkdir()
            (src / 'mod.json').write_text(json.dumps({'layers': []}))
            (src / 'rig.json').write_text(json.dumps({'joints': {}}))
            (src / 'head.png').write_bytes(b'example png bytes')
            before = {p.name: p.read_bytes() for p in src.iterdir()}
            package = export_mod(src, root / 'character.nova-mod')
            imported = import_mod(package, root / 'imported')
            self.assertEqual(before, {p.name: p.read_bytes() for p in imported.iterdir()})
            self.assertEqual(before, {p.name: p.read_bytes() for p in src.iterdir()})
            with self.assertRaises(FileExistsError):
                import_mod(package, imported)
            with self.assertRaises(FileExistsError):
                export_mod(src, package)

    def test_rejects_path_traversal_without_creating_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = root / 'bad.zip'
            with zipfile.ZipFile(package, 'w') as archive:
                archive.writestr('mod.json', '{}')
                archive.writestr('rig.json', '{}')
                archive.writestr('../outside.png', 'unsafe')
            with self.assertRaises(ValueError):
                import_mod(package, root / 'imported')
            self.assertFalse((root / 'imported').exists())
            self.assertFalse((root / 'outside.png').exists())

    def test_rejects_duplicate_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package = root / 'duplicate.zip'
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', UserWarning)
                with zipfile.ZipFile(package, 'w') as archive:
                    archive.writestr('mod.json', '{}')
                    archive.writestr('rig.json', '{}')
                    archive.writestr('head.png', 'one')
                    archive.writestr('head.png', 'two')
            with self.assertRaises(ValueError):
                import_mod(package, root / 'imported')


if __name__ == '__main__':
    unittest.main()
