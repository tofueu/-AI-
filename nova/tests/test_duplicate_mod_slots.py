"""Reject ambiguous duplicate MOD slots without mutating source definitions."""
import unittest
from nova.tools.mod_outfit import resolve_outfit


class DuplicateSlotTests(unittest.TestCase):
    def setUp(self):
        self.base = [
            {"slot": "body", "file": "body.png"},
            {"slot": "clothing", "file": "shirt.png"},
        ]

    def test_duplicate_base_slot_rejected(self):
        with self.assertRaisesRegex(ValueError, "duplicate base slot"):
            resolve_outfit(self.base + [dict(self.base[0])], [])

    def test_duplicate_mod_slot_rejected(self):
        mod = [
            {"slot": "clothing", "file": "shirt-a.png"},
            {"slot": "clothing", "file": "shirt-b.png"},
        ]
        with self.assertRaisesRegex(ValueError, "duplicate MOD slot"):
            resolve_outfit(self.base, mod)
        self.assertEqual(mod[0]["file"], "shirt-a.png")

    def test_distinct_mod_slots_allowed(self):
        mod = [
            {"slot": "clothing", "file": "shirt-new.png"},
            {"slot": "hair", "file": "hair.png", "visible": False},
        ]
        resolved = resolve_outfit(self.base, mod)
        self.assertEqual(next(x for x in resolved if x["slot"] == "clothing")["file"], "shirt-new.png")
        self.assertFalse(next(x for x in resolved if x["slot"] == "hair")["visible"])


if __name__ == "__main__":
    unittest.main()
