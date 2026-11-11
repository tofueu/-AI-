"""Regression tests for NOVA rig blueprint contracts."""
import unittest
from copy import deepcopy

try:
    from .rig_templates import create_blueprint, validate_blueprint
except ImportError:
    from rig_templates import create_blueprint, validate_blueprint


class BlueprintTests(unittest.TestCase):
    def test_both_styles_are_valid_and_independent(self):
        for style in ("chibi", "adult"):
            blueprint = create_blueprint(style)
            self.assertTrue(validate_blueprint(blueprint))
            self.assertEqual(blueprint["slots"]["top"]["fallback"], "basic_clothing")
            self.assertEqual(blueprint["slots"]["bottom"]["fallback"], "basic_clothing")
            blueprint["joints"]["head"]["pivot"][0] = 0
            self.assertNotEqual(create_blueprint(style)["joints"]["head"]["pivot"][0], 0)

    def test_replaceable_slots(self):
        slots = create_blueprint("chibi")["slots"]
        for name in ("head", "eyes", "mouth", "front_hair", "back_hair",
                     "hat", "top", "bottom", "accessory"):
            self.assertIn(name, slots)

    def test_invalid_slot_joint_and_pivot(self):
        original = create_blueprint("adult")
        broken = deepcopy(original)
        broken["slots"]["hat"]["joint"] = "missing"
        with self.assertRaises(ValueError):
            validate_blueprint(broken)
        broken = deepcopy(original)
        broken["slots"]["hat"]["pivot"] = [float("nan"), 1]
        with self.assertRaises(ValueError):
            validate_blueprint(broken)

    def test_infinite_slot_pivot_rejected(self):
        broken = create_blueprint("chibi")
        broken["slots"]["hat"]["pivot"] = [float("inf"), 1]
        with self.assertRaises(ValueError):
            validate_blueprint(broken)

    def test_invalid_style(self):
        with self.assertRaises(ValueError):
            create_blueprint("unknown")


if __name__ == "__main__":
    unittest.main()
