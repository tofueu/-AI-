"""Regression tests for archive name collisions and encrypted ZIP entries."""
import tempfile
import unittest
import zipfile
from pathlib import Path

try:
    from .mod_package import import_mod
except ImportError:
    from mod_package import import_mod


class ModArchiveSafetyTests(unittest.TestCase):
    def test_rejects_case_colliding_members(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / 'collision.nova-mod'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('mod.json', '{}')
                z.writestr('rig.json', '{}')
                z.writestr('Hair.png', 'a')
                z.writestr('hair.PNG', 'b')
            destination = root / 'imported'
            with self.assertRaisesRegex(ValueError, 'Unsafe MOD member'):
                import_mod(archive, destination)
            self.assertFalse(destination.exists())

    def test_rejects_encrypted_member_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / 'encrypted.nova-mod'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('mod.json', '{}')
                z.writestr('rig.json', '{}')
            # Modify the central directory encryption flag to simulate a hostile archive.
            data = bytearray(archive.read_bytes())
            index = 0
            patched = 0
            while True:
                index = data.find(b'PK\x01\x02', index)
                if index < 0:
                    break
                flag = int.from_bytes(data[index + 8:index + 10], 'little')
                data[index + 8:index + 10] = (flag | 1).to_bytes(2, 'little')
                index += 4
                patched += 1
            self.assertEqual(patched, 2, 'Expected to patch both central directory entries')
            archive.write_bytes(data)
            destination = root / 'imported'
            with self.assertRaisesRegex(ValueError, 'Unsafe MOD member'):
                import_mod(archive, destination)
            self.assertFalse(destination.exists())


if __name__ == '__main__':
    unittest.main()
