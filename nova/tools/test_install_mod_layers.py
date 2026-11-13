"""Regression tests for non-destructive NOVA layer installation."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.install_mod_layers import install_layers


class InstallLayersTests(unittest.TestCase):
    def test_replaces_head_and_clothes_for_both_rigs_without_mutating_template(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                template = create_template(root / "template", variant)
                size = (512, 512) if variant == "chibi" else (512, 768)
                head = root / "head.png"
                clothes = root / "clothes.png"
                Image.new("RGBA", size, (200, 20, 30, 255)).save(head)
                Image.new("RGBA", size, (10, 100, 200, 255)).save(clothes)
                original = (template / "head.png").read_bytes()
                target = root / "installed"
                install_layers(template, target, {"head": head, "clothes": clothes})
                self.assertEqual((template / "head.png").read_bytes(), original)
                with Image.open(target / "head.png") as image:
                    self.assertEqual(image.getpixel((0, 0)), (200, 20, 30, 255))
                with Image.open(target / "clothes.png") as image:
                    self.assertEqual(image.getpixel((0, 0)), (10, 100, 200, 255))
                self.assertTrue((target / "rig.json").is_file())
                with self.assertRaises(FileExistsError):
                    install_layers(template, target, {"head": head})

    def test_invalid_artwork_does_not_create_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            template = create_template(root / "template", "chibi")
            wrong = root / "wrong.png"
            Image.new("RGBA", (10, 10)).save(wrong)
            destination = root / "installed"
            with self.assertRaises(ValueError):
                install_layers(template, destination, {"eyes": wrong})
            self.assertFalse(destination.exists())
            with self.assertRaises(ValueError):
                install_layers(template, destination, {"unknown": wrong})
            self.assertFalse(destination.exists())

    def test_reject_output_inside_template(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            template = create_template(root / "template", "chibi")
            artwork = root / "eyes.png"
            Image.new("RGBA", (512, 512)).save(artwork)
            with self.assertRaises(ValueError):
                install_layers(template, template / "nested", {"eyes": artwork})


if __name__ == "__main__":
    unittest.main()
