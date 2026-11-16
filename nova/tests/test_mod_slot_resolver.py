import unittest
from PIL import Image
from nova.tools.mod_slot_resolver import resolve_mod_layers


class ModSlotResolverTests(unittest.TestCase):
    def setUp(self):
        self.size = (32, 48)
        self.blank = Image.new("RGBA", self.size)
        self.solid = Image.new("RGBA", self.size, (120, 30, 90, 255))
        self.base = {s: self.solid.copy() for s in ("body", "head", "top", "bottom", "shoes")}

    def test_missing_or_empty_clothes_use_base(self):
        layers, visible = resolve_mod_layers(self.base, {"top": self.blank}, canvas=self.size)
        self.assertTrue(visible["top"])
        self.assertEqual(layers["top"].getpixel((0, 0)), self.solid.getpixel((0, 0)))

    def test_empty_optional_slot_is_hidden(self):
        layers, visible = resolve_mod_layers(self.base, {"hat": self.blank}, canvas=self.size)
        self.assertIn("hat", layers)
        self.assertFalse(visible["hat"])

    def test_replacements_are_copied_and_visibility_applied(self):
        replacement = Image.new("RGBA", self.size, (2, 3, 4, 255))
        layers, visible = resolve_mod_layers(self.base, {"hair": replacement}, canvas=self.size,
                                             visibility={"hair": False, "top": False})
        self.assertFalse(visible["hair"])
        self.assertTrue(visible["top"])
        layers["hair"].putpixel((0, 0), (0, 0, 0, 0))
        self.assertEqual(replacement.getpixel((0, 0)), (2, 3, 4, 255))

    def test_invalid_dimensions_rejected(self):
        with self.assertRaises(ValueError):
            resolve_mod_layers(self.base, {"hair": Image.new("RGBA", (1, 1))}, canvas=self.size)

    def test_missing_base_clothing_rejected(self):
        with self.assertRaises(ValueError):
            resolve_mod_layers({"body": self.solid, "head": self.solid}, canvas=self.size)


if __name__ == "__main__":
    unittest.main()
