"""Regression tests for the transparent Q/adult skeleton guide."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template, SIZES
from nova.tools.export_rig_guide import export_rig_guide


class RigGuideTests(unittest.TestCase):
    def test_variants_transparent_and_non_destructive(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                mod = create_template(root / "mod", variant)
                before = {p.name: p.read_bytes() for p in mod.iterdir() if p.is_file()}
                output = root / "guide.png"
                self.assertEqual(export_rig_guide(mod, output), output)
                with Image.open(output) as guide:
                    self.assertEqual(guide.size, SIZES[variant])
                    self.assertEqual(guide.mode, "RGBA")
                    self.assertEqual(guide.getpixel((0, 0))[3], 0)
                    self.assertIsNotNone(guide.getbbox())
                self.assertEqual(before, {p.name: p.read_bytes() for p in mod.iterdir() if p.is_file()})
                with self.assertRaises(FileExistsError):
                    export_rig_guide(mod, output)
                with self.assertRaises(ValueError):
                    export_rig_guide(mod, mod / "internal.png")

    def test_invalid_joint_rejected_without_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mod = create_template(root / "mod", "chibi")
            rig_path = mod / "rig.json"
            rig = json.loads(rig_path.read_text(encoding="utf-8"))
            rig["joints"]["head"] = [1.5, 0.2]
            rig_path.write_text(json.dumps(rig), encoding="utf-8")
            output = root / "guide.png"
            with self.assertRaises(ValueError):
                export_rig_guide(mod, output)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
