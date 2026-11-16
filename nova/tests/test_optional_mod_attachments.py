"""Hidden optional MOD layers must not require joint bindings."""
import unittest
from PIL import Image
from nova.tools.mod_animation_pipeline import render_mod_animation


class OptionalAttachmentTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (16, 16)
        self.base = {slot: Image.new("RGBA", self.canvas, (80, 40, 20, 255))
                     for slot in ("body", "head", "top", "bottom", "shoes")}
        self.attachments = {slot: "root" for slot in self.base}
        self.poses = [{"root": (0.5, 0.5, 0)}, {"root": (0.6, 0.5, 0)}]

    def test_hidden_hat_without_attachment(self):
        mod = {"hat": Image.new("RGBA", self.canvas, (0, 255, 0, 255))}
        frames = render_mod_animation(
            self.base, mod, self.attachments, self.poses, self.canvas,
            visibility={"hat": False}, frames_per_segment=2)
        self.assertEqual(len(frames), 3)
        self.assertEqual(frames[0].getpixel((8, 8)), (80, 40, 20, 255))

    def test_transparent_hat_without_attachment(self):
        frames = render_mod_animation(
            self.base, {"hat": Image.new("RGBA", self.canvas)},
            self.attachments, self.poses, self.canvas, frames_per_segment=2)
        self.assertEqual(len(frames), 3)

    def test_visible_hat_still_requires_attachment(self):
        with self.assertRaisesRegex(ValueError, "missing joint attachments"):
            render_mod_animation(
                self.base, {"hat": Image.new("RGBA", self.canvas, (0, 255, 0, 255))},
                self.attachments, self.poses, self.canvas)

    def test_required_body_still_requires_attachment(self):
        attachments = dict(self.attachments)
        del attachments["body"]
        with self.assertRaisesRegex(ValueError, "missing joint attachments"):
            render_mod_animation(self.base, None, attachments, self.poses, self.canvas)


if __name__ == "__main__":
    unittest.main()
