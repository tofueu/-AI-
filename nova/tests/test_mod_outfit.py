"""Unit tests for mandatory base outfit fallback."""
import unittest
from nova.tools.mod_outfit import resolve_outfit

BASE = [
    {"slot": "body", "file": "base/body.png", "order": 0},
    {"slot": "clothing", "file": "base/clothes.png", "order": 1},
    {"slot": "hair", "file": "base/hair.png", "order": 2},
]


class OutfitTests(unittest.TestCase):
    def test_clothing_fallback_when_hidden(self):
        result = resolve_outfit(BASE, [{"slot": "clothing", "visible": False}])
        self.assertEqual(next(x for x in result if x["slot"] == "clothing")["file"], "base/clothes.png")

    def test_replace_clothing_and_hair(self):
        result = resolve_outfit(BASE, [
            {"slot": "clothing", "file": "mod/dress.png"},
            {"slot": "hair", "file": "mod/hair.png"},
        ])
        self.assertEqual({x["slot"]: x["file"] for x in result}["clothing"], "mod/dress.png")
        self.assertEqual({x["slot"]: x["file"] for x in result}["hair"], "mod/hair.png")

    def test_optional_hidden(self):
        result = resolve_outfit(BASE, [{"slot": "hair", "visible": False}])
        self.assertFalse(next(x for x in result if x["slot"] == "hair")["visible"])

    def test_base_required(self):
        with self.assertRaises(ValueError):
            resolve_outfit(BASE[1:], [])

    def test_inputs_unchanged(self):
        mod = [{"slot": "clothing", "visible": False}]
        resolve_outfit(BASE, mod)
        self.assertEqual(mod, [{"slot": "clothing", "visible": False}])


if __name__ == "__main__":
    unittest.main()
