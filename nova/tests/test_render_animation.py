"""GIF export regression tests for layered NOVA poses."""
import tempfile
import shutil
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.make_mod_templates import generate
from nova.tools.render_animation import render_gif


class RenderAnimationTests(unittest.TestCase):
    def test_two_poses_loop_and_preserve_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            pose = root / "chibi"
            body = pose / "body.png"
            Image.new("RGBA", (512, 512), "red").save(body)
            before = body.read_bytes()
            fallback = root / "outfit.png"
            Image.new("RGBA", (512, 512), "green").save(fallback)
            second = root / "second-pose"
            shutil.copytree(pose, second)
            Image.new("RGBA", (512, 512), "blue").save(second / "body.png")
            target = root / "motion.gif"
            render_gif([pose, second], fallback, target, 150)
            with Image.open(target) as gif:
                self.assertEqual(gif.format, "GIF")
                self.assertEqual(gif.n_frames, 2)
                self.assertEqual(gif.info["loop"], 0)
            self.assertEqual(body.read_bytes(), before)
            with self.assertRaises(FileExistsError):
                render_gif([pose, second], fallback, target)

    def test_invalid_animation_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaisesRegex(ValueError, "two poses"):
                render_gif([root], root / "outfit.png", root / "x.gif")
            with self.assertRaisesRegex(ValueError, "duration"):
                render_gif([root, root], root / "outfit.png", root / "x.gif", True)


if __name__ == "__main__":
    unittest.main()
