"""Tests for reviewable preset PNG frame exports."""
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from nova.tools.mod_slot_resolver import REQUIRED
from nova.tools.preset_animation import export_preset_png_sequence
from nova.tools.rig_presets import rig_preset


class PresetPngSequenceTests(unittest.TestCase):
    def _base(self, variant):
        canvas, _, _ = rig_preset(variant)
        return {slot: Image.new("RGBA", canvas, (80, 40, 160, 255))
                for slot in REQUIRED}

    def test_exports_both_variants_with_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            for variant in ("chibi", "adult"):
                target = Path(tmp) / variant
                export_preset_png_sequence(
                    self._base(variant), target, variant=variant,
                    frames_per_segment=2, frame_duration_ms=120,
                )
                data = json.loads((target / "manifest.json").read_text())
                self.assertEqual(data["variant"], variant)
                self.assertEqual(data["frame_duration_ms"], 120)
                self.assertEqual(len(data["frames"]), 6)
                self.assertEqual(len(list(target.glob("frame_*.png"))), 6)
                with Image.open(target / data["frames"][0]) as frame:
                    self.assertEqual(frame.mode, "RGBA")
                    self.assertEqual(list(frame.size), data["canvas"])

    def test_existing_directory_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "sequence"
            target.mkdir()
            marker = target / "keep.txt"
            marker.write_text("original")
            with self.assertRaises(FileExistsError):
                export_preset_png_sequence(
                    self._base("chibi"), target, frames_per_segment=2
                )
            self.assertEqual(marker.read_text(), "original")

    def test_invalid_duration_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "sequence"
            with self.assertRaises(ValueError):
                export_preset_png_sequence(
                    self._base("chibi"), target, frame_duration_ms=0
                )
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
