"""Ensure partial-alpha clothing MODs retain the official base outfit."""
import unittest

from PIL import Image

from nova.tools.mod_slot_resolver import resolve_mod_layers


class ClothingFallbackTests(unittest.TestCase):
    def setUp(self):
        self.base = {
            "body": Image.new("RGBA", (4, 4), (20, 20, 20, 255)),
            "head": Image.new("RGBA", (4, 4), (30, 30, 30, 255)),
            "top": Image.new("RGBA", (4, 4), (200, 0, 0, 255)),
            "bottom": Image.new("RGBA", (4, 4), (0, 200, 0, 255)),
            "shoes": Image.new("RGBA", (4, 4), (0, 0, 200, 255)),
        }

    def test_partial_alpha_top_keeps_base_in_cutout(self):
        replacement = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
        replacement.putpixel((0, 0), (255, 255, 0, 255))
        layers, visible = resolve_mod_layers(
            self.base, {"top": replacement}, canvas=(4, 4))
        self.assertTrue(visible["top"])
        self.assertEqual(layers["top"].getpixel((0, 0)), (255, 255, 0, 255))
        self.assertEqual(layers["top"].getpixel((3, 3)), (200, 0, 0, 255))

    def test_partially_transparent_bottom_preserves_opaque_base(self):
        replacement = Image.new("RGBA", (4, 4), (255, 0, 255, 128))
        layers, _ = resolve_mod_layers(
            self.base, {"bottom": replacement}, canvas=(4, 4))
        self.assertEqual(layers["bottom"].getpixel((2, 2))[3], 255)
        self.assertEqual(self.base["bottom"].getpixel((2, 2)), (0, 200, 0, 255))

    def test_fully_transparent_shoes_use_original(self):
        transparent = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
        layers, _ = resolve_mod_layers(
            self.base, {"shoes": transparent}, canvas=(4, 4))
        self.assertEqual(layers["shoes"].getpixel((1, 1)), (0, 0, 200, 255))


if __name__ == "__main__":
    unittest.main()
