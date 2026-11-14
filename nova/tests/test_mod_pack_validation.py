"""Functional acceptance checks for blank and painted NOVA MOD packs."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template, SIZES
from nova.tools.validate_mod_pack import validate_pack


class ModPackValidationTests(unittest.TestCase):
    def test_blank_templates_are_not_accepted_as_finished_art(self):
        for variant in SIZES:
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                pack = create_template(Path(tmp) / variant, variant)
                result = validate_pack(pack)
                self.assertFalse(result["ready"])
                self.assertIn("body/full_character artwork missing", result["errors"])

    def test_painted_body_and_clothes_pass(self):
        for variant, size in SIZES.items():
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                pack = create_template(Path(tmp) / variant, variant)
                for slot in ("body", "clothes"):
                    Image.new("RGBA", size, (120, 90, 140, 255)).save(pack / f"{slot}.png")
                result = validate_pack(pack)
                self.assertTrue(result["ready"], result["errors"])
                self.assertEqual(set(result["visible_layers"]), {"body", "clothes"})

    def test_symlink_layer_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = create_template(Path(tmp) / "chibi", "chibi")
            outside = Path(tmp) / "outside.png"
            Image.new("RGBA", SIZES["chibi"], (255, 0, 0, 255)).save(outside)
            (pack / "body.png").unlink()
            (pack / "body.png").symlink_to(outside)
            self.assertIn("symlink layer forbidden: body", validate_pack(pack)["errors"])


if __name__ == "__main__":
    unittest.main()
