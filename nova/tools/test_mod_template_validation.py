"""Reject unsafe MOD templates without creating a destination."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from nova.tools.create_mod_template import create_template
from nova.tools.install_mod_layers import install_layers


class TemplateValidationTests(unittest.TestCase):
    def test_rejects_unsafe_and_duplicate_layer_paths(self):
        for variant in ("chibi", "adult"):
            for bad in ("../outside.png", "missing.png", "head.png"):
                with self.subTest(variant=variant, bad=bad), tempfile.TemporaryDirectory() as tmp:
                    root = Path(tmp)
                    template = create_template(root / "template", variant)
                    manifest_path = template / "manifest.json"
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    manifest["layers"]["eyes"] = bad
                    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
                    artwork = root / "art.png"
                    Image.new("RGBA", tuple(manifest["canvas"]), (255, 0, 0, 255)).save(artwork)
                    target = root / "installed"
                    with self.assertRaises(ValueError):
                        install_layers(template, target, {"head": artwork})
                    self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
