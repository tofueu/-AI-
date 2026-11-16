"""Regression checks for NOVA GIF transparency and adult-profile output."""
import shutil
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.make_mod_templates import generate
from nova.tools.render_animation import render_gif


class AnimationProfileTests(unittest.TestCase):
    def test_adult_animation_keeps_transparent_background(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            first = root / "adult"
            second = root / "adult-pose-2"
            shutil.copytree(first, second)
            for directory, x in ((first, 30), (second, 160)):
                body = Image.new("RGBA", (512, 768), (0, 0, 0, 0))
                for px in range(x, x + 40):
                    for py in range(250, 300):
                        body.putpixel((px, py), (200, 90, 220, 255))
                body.save(directory / "body.png")
            fallback = root / "base.png"
            outfit = Image.new("RGBA", (512, 768), (0, 0, 0, 0))
            for px in range(220, 260):
                for py in range(350, 390):
                    outfit.putpixel((px, py), (20, 150, 80, 255))
            outfit.save(fallback)
            target = root / "adult.gif"
            render_gif([first, second], fallback, target, 120)
            with Image.open(target) as gif:
                self.assertEqual(gif.n_frames, 2)
                self.assertEqual(gif.size, (512, 768))
                for index, x in ((0, 35), (1, 165)):
                    gif.seek(index)
                    rgba = gif.convert("RGBA")
                    self.assertEqual(rgba.getpixel((0, 0))[3], 0)
                    self.assertEqual(rgba.getpixel((x, 270))[3], 255)
                    self.assertEqual(rgba.getpixel((230, 365))[3], 255)

    def test_mixed_profiles_rejected_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            for profile, size in (("chibi", (512, 512)), ("adult", (512, 768))):
                Image.new("RGBA", size, "purple").save(root / profile / "body.png")
            fallback = root / "base.png"
            Image.new("RGBA", (512, 512), "green").save(fallback)
            target = root / "mixed.gif"
            with self.assertRaises((ValueError, OSError)):
                render_gif([root / "chibi", root / "adult"], fallback, target)
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
