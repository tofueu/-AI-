"""Bounded contact sheet input regression tests."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from nova.tools.animation_contact_sheet import export_contact_sheet


class ContactSheetBoundsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sequence = self.root / "sequence"
        self.sequence.mkdir()
        Image.new("RGBA", (8, 8)).save(self.sequence / "frame_0000.png")

    def manifest(self, canvas, frames):
        (self.sequence / "manifest.json").write_text(
            json.dumps({"canvas": canvas, "frames": frames}), encoding="utf-8"
        )

    def test_duplicate_frames_rejected(self):
        self.manifest([8, 8], ["frame_0000.png"] * 2)
        with self.assertRaises(ValueError):
            export_contact_sheet(self.sequence, self.root / "out.png")

    def test_excessive_frames_rejected(self):
        self.manifest([8, 8], ["frame_%04d.png" % i for i in range(257)])
        with self.assertRaises(ValueError):
            export_contact_sheet(self.sequence, self.root / "out.png")

    def test_invalid_canvas_dimensions_rejected(self):
        for canvas in ([0, 8], [8, -1], [True, 8], [4097, 8]):
            with self.subTest(canvas=canvas):
                self.manifest(canvas, ["frame_0000.png"])
                with self.assertRaises(ValueError):
                    export_contact_sheet(self.sequence, self.root / "out.png")

    def test_excessive_sheet_allocation_rejected(self):
        self.manifest([8, 8], ["frame_%04d.png" % i for i in range(65)])
        with self.assertRaises(ValueError):
            export_contact_sheet(self.sequence, self.root / "out.png",
                                 columns=32, thumb_size=(1024, 1024))
        self.assertFalse((self.root / "out.png").exists())

    def test_valid_single_frame_still_exports(self):
        self.manifest([8, 8], ["frame_0000.png"])
        output = export_contact_sheet(self.sequence, self.root / "out.png")
        self.assertTrue(output.is_file())


if __name__ == "__main__":
    unittest.main()
