import copy
import json
import tempfile
import unittest
from pathlib import Path
from mod_rig import RIGS, SLOT_JOINTS, generate, validate


class RigTests(unittest.TestCase):
    def test_both_rigs_and_no_overwrite(self):
        for variant, rig in RIGS.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                target = Path(tmp) / 'rig.json'
                generate(target, variant)
                data = json.loads(target.read_text())
                self.assertEqual(data['canvas'], rig['canvas'])
                self.assertEqual(data['slot_joints'], SLOT_JOINTS)
                self.assertTrue(validate(data))
                with self.assertRaises(FileExistsError):
                    generate(target, variant)

    def test_invalid_cycle_and_pivot(self):
        rig = copy.deepcopy(RIGS['chibi'])
        rig['joints']['torso']['parent'] = 'head'
        with self.assertRaises(ValueError):
            validate(rig)
        rig = copy.deepcopy(RIGS['adult'])
        rig['joints']['head']['pivot'] = [1.5, 0.5]
        with self.assertRaises(ValueError):
            validate(rig)

    def test_unknown_variant_no_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'rig.json'
            with self.assertRaises(ValueError):
                generate(target, 'other')
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
