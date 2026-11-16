"""Mandatory character layers must survive transparent MOD replacements."""
import unittest
from PIL import Image
from nova.tools.mod_slot_resolver import resolve_mod_layers


class RequiredLayerFallbackTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (16, 16)
        self.required = ("body", "head", "top", "bottom", "shoes")
        self.base = {
            slot: Image.new("RGBA", self.canvas, (40, 80, 120, 255))
            for slot in self.required
        }

    def test_transparent_body_and_head_mods_use_base(self):
        transparent = Image.new("RGBA", self.canvas)
        layers, visible = resolve_mod_layers(
            self.base, {"body": transparent, "head": transparent},
            canvas=self.canvas)
        for slot in ("body", "head"):
            self.assertTrue(visible[slot])
            self.assertEqual(layers[slot].getpixel((8, 8)), (40, 80, 120, 255))
        self.assertIsNone(transparent.getbbox())

    def test_required_layers_ignore_visibility_disable(self):
        layers, visible = resolve_mod_layers(
            self.base, canvas=self.canvas,
            visibility={slot: False for slot in self.required})
        self.assertTrue(all(visible[slot] for slot in self.required))
        self.assertEqual(len(layers), len(self.required))

    def test_fully_transparent_official_base_is_rejected(self):
        for slot in self.required:
            with self.subTest(slot=slot):
                base = dict(self.base)
                base[slot] = Image.new("RGBA", self.canvas)
                with self.assertRaisesRegex(ValueError, "official base"):
                    resolve_mod_layers(base, canvas=self.canvas)

    def test_opaque_body_mod_replaces_base_without_mutation(self):
        mod_body = Image.new("RGBA", self.canvas, (200, 20, 20, 255))
        before = mod_body.tobytes()
        layers, visible = resolve_mod_layers(
            self.base, {"body": mod_body}, canvas=self.canvas)
        self.assertTrue(visible["body"])
        self.assertEqual(layers["body"].getpixel((8, 8)), (200, 20, 20, 255))
        self.assertEqual(mod_body.tobytes(), before)


if __name__ == "__main__":
    unittest.main()
