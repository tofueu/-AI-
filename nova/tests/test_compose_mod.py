"""Regression tests for NOVA layered MOD compositing."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.make_mod_templates import generate
from nova.tools.compose_mod import compose


class ComposeModTests(unittest.TestCase):
    def test_both_profiles_fallback_and_optional_visibility(self):
        for profile in ("chibi", "adult"):
            with self.subTest(profile=profile), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                generate(root)
                folder = root / profile
                manifest = json.loads((folder / "manifest.json").read_text())
                size = tuple(manifest["canvas"])
                Image.new("RGBA", size, (255, 0, 0, 255)).save(folder / "body.png")
                fallback = root / "fallback.png"
                Image.new("RGBA", size, (0, 255, 0, 255)).save(fallback)
                # An optional visible layer can override the outfit.
                Image.new("RGBA", size, (0, 0, 255, 255)).save(folder / "hat.png")
                manifest["layers"][-2]["visible"] = False
                (folder / "manifest.json").write_text(json.dumps(manifest))
                result = compose(folder, fallback)
                self.assertEqual(result.getpixel((0, 0)), (0, 255, 0, 255))
                self.assertFalse((root / "output.png").exists())

    def test_missing_fallback_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            Image.new("RGBA", (512, 512), "red").save(folder / "body.png")
            with self.assertRaises(FileNotFoundError):
                compose(folder, root / "missing.png")

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            manifest_path = folder / "manifest.json"
            manifest = json.loads(manifest_path.read_text())
            manifest["layers"][0]["file"] = "../outside.png"
            manifest_path.write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "unsafe"):
                compose(folder, root / "fallback.png")

    def test_existing_output_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            Image.new("RGBA", (512, 512), "red").save(folder / "body.png")
            fallback = root / "fallback.png"
            Image.new("RGBA", (512, 512), "green").save(fallback)
            target = root / "existing.png"
            target.write_bytes(b"preserve")
            with self.assertRaises(FileExistsError):
                compose(folder, fallback, target)
            self.assertEqual(target.read_bytes(), b"preserve")


if __name__ == "__main__":
    unittest.main()
