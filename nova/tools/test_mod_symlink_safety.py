"""MOD templates must never copy symlink targets outside the source tree."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.create_mod_template import create_template
from nova.tools.install_mod_layers import install_layers


class ModSymlinkTests(unittest.TestCase):
    def test_rejects_unrelated_symlink_without_creating_output(self):
        for variant in ("chibi", "adult"):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                template = create_template(root / "template", variant)
                secret = root / "outside.txt"
                secret.write_text("do not copy", encoding="utf-8")
                try:
                    (template / "unrelated.txt").symlink_to(secret)
                except (OSError, NotImplementedError):
                    self.skipTest("Symlinks unavailable in this environment")
                with Image.open(template / "head.png") as image:
                    size = image.size
                art = root / "art.png"
                Image.new("RGBA", size, (255, 0, 0, 255)).save(art)
                output = root / "installed"
                with self.assertRaisesRegex(ValueError, "symbolic link"):
                    install_layers(template, output, {"head": art})
                self.assertFalse(output.exists())
                self.assertEqual(secret.read_text(encoding="utf-8"), "do not copy")


if __name__ == "__main__":
    unittest.main()
