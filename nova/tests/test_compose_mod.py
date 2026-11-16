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

    def test_new_export_is_png_and_preserves_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            body = folder / "body.png"
            Image.new("RGBA", (512, 512), "red").save(body)
            original = body.read_bytes()
            fallback = root / "fallback.png"
            Image.new("RGBA", (512, 512), "green").save(fallback)
            target = root / "render.png"
            compose(folder, fallback, target)
            with Image.open(target) as rendered:
                self.assertEqual(rendered.format, "PNG")
                self.assertEqual(rendered.getpixel((0, 0)), (0, 255, 0, 255))
            self.assertEqual(body.read_bytes(), original)
            with self.assertRaises(FileExistsError):
                compose(folder, fallback, target)

    def test_invalid_layer_metadata_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            path = folder / "manifest.json"
            original = json.loads(path.read_text())
            for field, bad, message in (
                ("order", True, "order"),
                ("order", "0", "order"),
                ("visible", "false", "visibility"),
                ("visible", 0, "visibility"),
            ):
                with self.subTest(field=field, bad=bad):
                    manifest = json.loads(json.dumps(original))
                    manifest["layers"][0][field] = bad
                    path.write_text(json.dumps(manifest))
                    with self.assertRaisesRegex(ValueError, message):
                        compose(folder, root / "fallback.png")
            path.write_text(json.dumps(original))

    def test_non_string_slot_rejected_cleanly(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            path = folder / "manifest.json"
            original = json.loads(path.read_text())
            for bad in (None, 42, ["body"], {"name": "body"}):
                with self.subTest(bad=bad):
                    manifest = json.loads(json.dumps(original))
                    manifest["layers"][0]["slot"] = bad
                    path.write_text(json.dumps(manifest))
                    with self.assertRaisesRegex(ValueError, "slot type"):
                        compose(folder, root / "fallback.png")

    def test_missing_fallback_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            Image.new("RGBA", (512, 512), "red").save(folder / "body.png")
            with self.assertRaises(FileNotFoundError):
                compose(folder, root / "missing.png")

    def test_symlinked_layer_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            outside = root / "outside.png"
            Image.new("RGBA", (512, 512), "red").save(outside)
            layer = folder / "body.png"
            layer.unlink()
            try:
                layer.symlink_to(outside)
            except (OSError, NotImplementedError):
                self.skipTest("symlinks unavailable on this platform")
            with self.assertRaisesRegex(ValueError, "symlinked"):
                compose(folder, root / "fallback.png")

    def test_symlinked_manifest_and_fallback_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            generate(root)
            folder = root / "chibi"
            Image.new("RGBA", (512, 512), "red").save(folder / "body.png")
            fallback = root / "fallback.png"
            Image.new("RGBA", (512, 512), "green").save(fallback)
            original = folder / "manifest.json"
            other = root / "external-manifest.json"
            other.write_bytes(original.read_bytes())
            original.unlink()
            try:
                original.symlink_to(other)
            except (OSError, NotImplementedError):
                self.skipTest("symlinks unavailable on this platform")
            with self.assertRaisesRegex(ValueError, "symlinked"):
                compose(folder, fallback)
            original.unlink()
            original.write_bytes(other.read_bytes())
            linked_fallback = root / "linked-fallback.png"
            linked_fallback.symlink_to(fallback)
            with self.assertRaisesRegex(ValueError, "symlinked"):
                compose(folder, linked_fallback)

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
