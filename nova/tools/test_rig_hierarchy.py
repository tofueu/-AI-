import unittest
try:
    from .rig_hierarchy import resolve_hierarchy
except ImportError:
    from rig_hierarchy import resolve_hierarchy


class HierarchyTests(unittest.TestCase):
    def setUp(self):
        self.joints = {
            "body": {"parent": None, "pivot": [10, 10]},
            "hand": {"parent": "body", "pivot": [20, 10]},
        }

    def test_parent_translation_follows_child(self):
        result = resolve_hierarchy(self.joints, {"body": [3, 4, 0]})
        self.assertEqual(result["hand"], (3, 4, 0))

    def test_parent_rotation_moves_child_pivot(self):
        result = resolve_hierarchy(self.joints, {"body": [0, 0, 90]})
        self.assertAlmostEqual(result["hand"][0], -10)
        self.assertAlmostEqual(result["hand"][1], -10)
        self.assertEqual(result["hand"][2], 90)

    def test_local_child_rotation_adds_parent_rotation(self):
        result = resolve_hierarchy(self.joints, {"body": [0, 0, 30], "hand": [0, 0, 20]})
        self.assertEqual(result["hand"][2], 50)

    def test_rejects_cycles_and_unknown_joints(self):
        with self.assertRaises(ValueError):
            resolve_hierarchy({"a": {"parent": "b", "pivot": [0, 0]},
                               "b": {"parent": "a", "pivot": [0, 0]}}, {})
        with self.assertRaises(ValueError):
            resolve_hierarchy(self.joints, {"missing": [0, 0, 0]})

    def test_does_not_mutate_source(self):
        before = repr(self.joints)
        resolve_hierarchy(self.joints, {"body": [1, 2, 3]})
        self.assertEqual(repr(self.joints), before)


if __name__ == "__main__":
    unittest.main()
