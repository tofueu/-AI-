"""Regression coverage for layer ordering and transparent MOD rendering."""
import unittest

from PIL import Image

from nova.tools.rig_layer_renderer import render_pose


class ModLayerOrderTests(unittest.TestCase):
    def setUp(self):
        self.canvas = (24, 24)
        self.pose = {"root": (0.5, 0.5, 0)}
        self.attachments = {"body": "root", "top": "root", "hat": "root"}

    def test_order_determines_visible_top_layer(self):
        body = Image.new("RGBA", self.canvas, (255, 0, 0, 255))
        top = Image.new("RGBA", self.canvas, (0, 0, 255, 255))
        a = render_pose({"body": body, "top": top},
                        {"body": "root", "top": "root"},
                        self.pose, self.pose, self.canvas)
        b = render_pose({"top": top, "body": body},
                        {"top": "root", "body": "root"},
                        self.pose, self.pose, self.canvas)
        self.assertEqual(a.getpixel((12, 12)), (0, 0, 255, 255))
        self.assertEqual(b.getpixel((12, 12)), (255, 0, 0, 255))

    def test_hidden_slot_and_empty_layer_leave_base_unchanged(self):
        body = Image.new("RGBA", self.canvas, (100, 50, 20, 255))
        hat = Image.new("RGBA", self.canvas)
        before = body.tobytes()
        output = render_pose({"body": body, "hat": hat},
                             {"body": "root", "hat": "root"},
                             self.pose, self.pose, self.canvas,
                             visible={"hat": False})
        self.assertEqual(output.getpixel((12, 12)), (100, 50, 20, 255))
        self.assertEqual(body.tobytes(), before)
        self.assertEqual(hat.getbbox(), None)

    def test_translucent_mod_blends_without_mutating_sources(self):
        body = Image.new("RGBA", self.canvas, (255, 0, 0, 255))
        top = Image.new("RGBA", self.canvas, (0, 0, 255, 128))
        source = top.tobytes()
        result = render_pose({"body": body, "top": top},
                             {"body": "root", "top": "root"},
                             self.pose, self.pose, self.canvas)
        r, g, b, a = result.getpixel((12, 12))
        self.assertEqual(a, 255)
        self.assertLess(r, 255)
        self.assertGreater(b, 0)
        self.assertEqual(g, 0)
        self.assertEqual(top.tobytes(), source)


if __name__ == "__main__":
    unittest.main()
