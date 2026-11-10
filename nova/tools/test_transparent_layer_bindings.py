"""Empty PNG slots must not hide broken joint bindings."""
import unittest

from PIL import Image

try:
    from .create_blank_mod import SIZES, create_template
    from .rig_animator import render_frame
except ImportError:
    from create_blank_mod import SIZES, create_template
    from rig_animator import render_frame


class TransparentLayerBindingTests(unittest.TestCase):
    def test_transparent_slot_with_missing_binding_fails(self):
        rig = {
            "canvas": [32, 32],
            "joints": {"root": {"parent": None, "pivot": [0.5, 0.5]}},
            "slot_joints": {},
        }
        with self.assertRaisesRegex(ValueError, "Missing joint binding"):
            render_frame(rig, {"head": Image.new("RGBA", (32, 32))}, {})

    def test_transparent_slot_with_unknown_joint_fails(self):
        rig = {
            "canvas": [32, 32],
            "joints": {"root": {"parent": None, "pivot": [0.5, 0.5]}},
            "slot_joints": {"head": "missing"},
        }
        with self.assertRaisesRegex(ValueError, "Unknown joint binding"):
            render_frame(rig, {"head": Image.new("RGBA", (32, 32))}, {})

    def test_valid_transparent_slot_renders(self):
        rig = {
            "canvas": [32, 32],
            "joints": {"root": {"parent": None, "pivot": [0.5, 0.5]}},
            "slot_joints": {"head": "root"},
        }
        image = render_frame(rig, {"head": Image.new("RGBA", (32, 32))}, {})
        self.assertIsNone(image.getchannel("A").getbbox())


if __name__ == "__main__":
    unittest.main()
