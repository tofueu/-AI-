"""Integration tests for the preset-to-MOD rendering entry point."""
import unittest
from PIL import Image
from nova.tools.mod_slot_resolver import REQUIRED
from nova.tools.preset_animation import render_preset_animation
from nova.tools.rig_presets import rig_preset


class PresetAnimationTests(unittest.TestCase):
    def _base(self, canvas):
        return {
            slot: Image.new("RGBA", canvas, (120, 60, 180, 255))
            for slot in REQUIRED
        }

    def test_both_variants_render_real_rgba_frames(self):
        for variant in ("chibi", "adult"):
            canvas, _, _ = rig_preset(variant)
            frames = render_preset_animation(
                self._base(canvas), variant=variant, frames_per_segment=2
            )
            self.assertEqual(len(frames), 6)
            self.assertTrue(all(f.mode == "RGBA" and f.size == canvas for f in frames))
            self.assertIsNotNone(frames[0].getbbox())

    def test_transparent_optional_mod_does_not_block_render(self):
        canvas, _, _ = rig_preset("chibi")
        base = self._base(canvas)
        blank = Image.new("RGBA", canvas)
        frames = render_preset_animation(base, {"hat": blank}, frames_per_segment=2)
        self.assertEqual(len(frames), 6)
        self.assertIsNone(blank.getbbox())

    def test_rejects_wrong_variant_canvas(self):
        base = self._base((512, 512))
        with self.assertRaises(ValueError):
            render_preset_animation(base, variant="adult")

    def test_does_not_mutate_base_images(self):
        canvas, _, _ = rig_preset("chibi")
        base = self._base(canvas)
        before = {k: v.tobytes() for k, v in base.items()}
        render_preset_animation(base, frames_per_segment=2)
        self.assertEqual(before, {k: v.tobytes() for k, v in base.items()})


if __name__ == "__main__":
    unittest.main()
